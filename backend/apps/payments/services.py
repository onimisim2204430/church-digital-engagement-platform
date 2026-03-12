"""Service layer for all Paystack API communication."""

import logging
import os
from typing import Any, Dict, Optional

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from .exceptions import (
    PaymentConfigurationError,
    PaymentGatewayError,
    PaymentInitializationError,
    PaymentVerificationError,
)
from .models import PaymentAuditLog

logger = logging.getLogger('payments')

PAYSTACK_BASE_URL = 'https://api.paystack.co'
REQUEST_TIMEOUT = (5, 20)


def _get_paystack_secret_key() -> str:
    """Load Paystack secret key from environment variables."""
    secret_key = os.environ.get('PAYSTACK_SECRET_KEY')
    if not secret_key:
        raise PaymentConfigurationError('PAYSTACK_SECRET_KEY is not configured')
    return secret_key


def _build_session() -> requests.Session:
    """Create requests session with retry policy."""
    retry_strategy = Retry(
        total=3,
        connect=3,
        read=3,
        backoff_factor=0.5,
        status_forcelist=(408, 429, 500, 502, 503, 504),
        allowed_methods=frozenset(['GET', 'POST']),
    )

    adapter = HTTPAdapter(max_retries=retry_strategy)
    session = requests.Session()
    session.mount('https://', adapter)
    return session


def _request_paystack(method: str, endpoint: str, payload: Optional[dict] = None) -> Dict[str, Any]:
    """Execute an HTTP request to Paystack with safe error handling."""
    secret_key = _get_paystack_secret_key()
    headers = {
        'Authorization': f'Bearer {secret_key}',
        'Content-Type': 'application/json',
    }

    url = f'{PAYSTACK_BASE_URL}{endpoint}'
    session = _build_session()

    try:
        response = session.request(
            method=method,
            url=url,
            json=payload,
            timeout=REQUEST_TIMEOUT,
            headers=headers,
        )
    except requests.RequestException as exc:
        logger.exception('Paystack network error', extra={'endpoint': endpoint})
        raise PaymentGatewayError('Unable to reach payment gateway') from exc

    try:
        response_data = response.json()
    except ValueError as exc:
        logger.error('Invalid Paystack response JSON', extra={'endpoint': endpoint})
        raise PaymentGatewayError('Invalid response received from payment gateway') from exc

    if response.status_code >= 500:
        logger.error('Paystack server error', extra={'endpoint': endpoint, 'status_code': response.status_code})
        raise PaymentGatewayError('Payment gateway server error')

    if response.status_code >= 400:
        message = response_data.get('message', 'Payment gateway rejected request')
        logger.error(
            'Paystack request rejected',
            extra={'endpoint': endpoint, 'status_code': response.status_code, 'gateway_message': message},
        )
        raise PaymentGatewayError(message)

    if not isinstance(response_data, dict) or 'status' not in response_data:
        logger.error('Malformed Paystack response payload', extra={'endpoint': endpoint})
        raise PaymentGatewayError('Malformed response from payment gateway')

    return response_data


def initialize_transaction(
    email: str,
    amount: int,
    reference: str,
    metadata: Optional[dict] = None,
    callback_url: Optional[str] = None,
) -> Dict[str, Any]:
    """Initialize a new Paystack transaction."""
    payload = {
        'email': email,
        'amount': amount,
        'reference': reference,
        'metadata': metadata or {},
    }

    if callback_url:
        payload['callback_url'] = callback_url

    try:
        data = _request_paystack('POST', '/transaction/initialize', payload)
    except (PaymentGatewayError, PaymentConfigurationError) as exc:
        logger.exception('Payment initialization failed', extra={'reference': reference})
        raise PaymentInitializationError(str(exc)) from exc

    if not data.get('status'):
        message = data.get('message', 'Unable to initialize payment')
        logger.error('Paystack initialization returned failure', extra={'reference': reference, 'message': message})
        raise PaymentInitializationError(message)

    transaction_data = data.get('data')
    if not isinstance(transaction_data, dict):
        logger.error('Initialization response missing data payload', extra={'reference': reference})
        raise PaymentInitializationError('Invalid initialization payload received')

    return transaction_data


def verify_transaction(reference: str) -> Dict[str, Any]:
    """Verify a transaction by reference via Paystack."""
    from .models import PaymentTransaction
    
    transaction = None
    try:
        transaction = PaymentTransaction.objects.get(reference=reference)
    except PaymentTransaction.DoesNotExist:
        pass

    try:
        # Log verification attempt
        if transaction:
            from .utils import log_audit_event
            log_audit_event(
                event_type=PaymentAuditLog.EventType.TX_VERIFICATION_STARTED,
                message=f'Verifying transaction: {reference}',
                transaction=transaction,
                severity='INFO',
            )

        data = _request_paystack('GET', f'/transaction/verify/{reference}')
    except (PaymentGatewayError, PaymentConfigurationError) as exc:
        logger.exception('Payment verification failed', extra={'reference': reference})
        
        # Log network error
        if transaction:
            from .utils import log_audit_event
            log_audit_event(
                event_type=PaymentAuditLog.EventType.NETWORK_ERROR,
                message=f'Verification failed - Network error: {str(exc)}',
                transaction=transaction,
                error_details=str(exc),
                severity='ERROR',
            )
        raise PaymentVerificationError(str(exc)) from exc

    if not data.get('status'):
        message = data.get('message', 'Unable to verify payment')
        logger.error('Paystack verification returned failure', extra={'reference': reference, 'message': message})
        
        # Log verification failure
        if transaction:
            from .utils import log_audit_event
            log_audit_event(
                event_type=PaymentAuditLog.EventType.TX_VERIFICATION_FAILED,
                message=f'Verification failed - {message}',
                transaction=transaction,
                response_data=data,
                severity='WARNING',
            )
        raise PaymentVerificationError(message)

    transaction_data = data.get('data')
    if not isinstance(transaction_data, dict):
        logger.error('Verification response missing data payload', extra={'reference': reference})
        
        # Log malformed response
        if transaction:
            from .utils import log_audit_event
            log_audit_event(
                event_type=PaymentAuditLog.EventType.VALIDATION_ERROR,
                message='Verification response missing data payload',
                transaction=transaction,
                response_data=data,
                severity='ERROR',
            )
        raise PaymentVerificationError('Invalid verification payload received')

    # Log successful verification
    if transaction:
        from .utils import log_audit_event
        log_audit_event(
            event_type=PaymentAuditLog.EventType.TX_VERIFICATION_SUCCESS,
            message=f'Verification successful: {reference}',
            transaction=transaction,
            response_data=transaction_data,
            severity='INFO',
        )

    return transaction_data


def fetch_transaction(reference: str) -> Dict[str, Any]:
    """Fetch transaction details by reference."""
    try:
        data = _request_paystack('GET', f'/transaction/verify/{reference}')
    except (PaymentGatewayError, PaymentConfigurationError) as exc:
        logger.exception('Fetching transaction failed', extra={'reference': reference})
        raise PaymentVerificationError(str(exc)) from exc

    if not data.get('status'):
        message = data.get('message', 'Unable to fetch transaction')
        logger.error('Paystack fetch returned failure', extra={'reference': reference, 'message': message})
        raise PaymentVerificationError(message)

    return data


def fetch_paystack_balance() -> int:
    """Fetch available Paystack balance in kobo for NGN."""
    try:
        data = _request_paystack('GET', '/balance')
    except (PaymentGatewayError, PaymentConfigurationError) as exc:
        logger.exception('Failed to fetch Paystack balance')
        raise PaymentVerificationError(str(exc)) from exc

    if not data.get('status'):
        message = data.get('message', 'Unable to fetch balance')
        logger.error('Paystack balance fetch returned failure', extra={'message': message})
        raise PaymentVerificationError(message)

    balances = data.get('data')
    if not isinstance(balances, list):
        raise PaymentVerificationError('Invalid balance payload received')

    ngn_wallet = next((entry for entry in balances if str(entry.get('currency', '')).upper() == 'NGN'), None)
    if ngn_wallet is None:
        raise PaymentVerificationError('NGN wallet not found on Paystack account')

    return int(ngn_wallet.get('balance', 0) or 0)


def initiate_refund(transaction_reference: str) -> Dict[str, Any]:
    """Initiate refund against a Paystack transaction reference."""
    payload = {
        'transaction': transaction_reference,
    }
    try:
        data = _request_paystack('POST', '/refund', payload)
    except (PaymentGatewayError, PaymentConfigurationError) as exc:
        logger.exception('Refund initiation failed', extra={'reference': transaction_reference})
        raise PaymentVerificationError(str(exc)) from exc

    if not data.get('status'):
        message = data.get('message', 'Unable to initiate refund')
        logger.error('Paystack refund returned failure', extra={'reference': transaction_reference, 'message': message})
        raise PaymentVerificationError(message)

    return data
