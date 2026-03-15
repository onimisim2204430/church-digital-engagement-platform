import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


class PaystackService:
    """
    Minimal Paystack transfer integration service.
    Handles recipient creation, transfer initiation, and transfer verification.
    """

    BASE_URL = "https://api.paystack.co"

    def __init__(self):
        """Initialize PaystackService with API credentials from Django settings."""
        self.secret_key = getattr(settings, 'PAYSTACK_SECRET_KEY', None)
        if not self.secret_key:
            logger.error("PAYSTACK_SECRET_KEY not configured in settings")

    def _headers(self):
        """Return authorization headers for Paystack API requests."""
        return {
            'Authorization': f'Bearer {self.secret_key}',
            'Content-Type': 'application/json',
        }

    def resolve_account(self, account_number, bank_code):
        """
        Resolve (verify) an account number to get the account holder's name.
        This mimics real banking - user provides account + bank, system resolves the name.

        Args:
            account_number (str): Bank account number (10 digits)
            bank_code (str): Bank code (3 digits)

        Returns:
            dict: {
                "status": bool (success/failure),
                "account_name": str or None (actual name from bank),
                "account_number": str (from bank),
                "response": dict (full API response)
            }
        """
        try:
            # Paystack endpoint: GET /bank/{bank_code}/resolve?account_number={account_number}
            url = f"{self.BASE_URL}/bank/resolve"
            params = {
                'account_number': account_number,
                'bank_code': bank_code,
            }

            logger.info(
                f"[PAYSTACK] Resolving account name",
                extra={
                    'bank_code': bank_code,
                    'account_number_masked': account_number[-4:],
                }
            )

            response = requests.get(url, params=params, headers=self._headers(), timeout=10)
            data = response.json()

            logger.info(
                f"[PAYSTACK RESPONSE] Resolve account HTTP {response.status_code}",
                extra={
                    'http_status': response.status_code,
                    'api_status': data.get('status'),
                    'api_message': data.get('message'),
                }
            )

            if response.status_code == 200 and data.get('status'):
                account_data = data.get('data', {})
                account_name = account_data.get('account_name', '').strip()
                
                logger.info(
                    f"[PAYSTACK SUCCESS] Account resolved",
                    extra={
                        'account_name': account_name,
                        'account_number_masked': account_number[-4:],
                    }
                )
                
                return {
                    "status": True,
                    "account_name": account_name,
                    "account_number": account_data.get('account_number'),
                    "response": data,
                }
            else:
                error_message = data.get('message', 'Unknown error')
                logger.warning(
                    f"[PAYSTACK ERROR] Account resolution failed: {error_message}",
                    extra={
                        'paystack_message': error_message,
                        'account_number_masked': account_number[-4:],
                    }
                )
                return {
                    "status": False,
                    "account_name": None,
                    "account_number": None,
                    "response": data,
                }

        except requests.exceptions.Timeout:
            logger.error(
                f"[PAYSTACK ERROR] Timeout resolving account",
                extra={'account_number_masked': account_number[-4:]}
            )
            return {
                "status": False,
                "account_name": None,
                "account_number": None,
                "response": {"error": "Timeout"},
            }
        except Exception as e:
            logger.error(
                f"[PAYSTACK ERROR] Error resolving account: {str(e)}",
                extra={'error': str(e)}
            )
            return {
                "status": False,
                "account_name": None,
                "account_number": None,
                "response": {"error": str(e)},
            }

    def create_transfer_recipient(self, name, account_number, bank_code, currency="NGN"):
        """
        Create a transfer recipient on Paystack.

        Args:
            name (str): Recipient name
            account_number (str): Bank account number
            bank_code (str): Bank code
            currency (str): Currency code (default: NGN)

        Returns:
            dict: {
                "status": bool (success/failure),
                "recipient_code": str or None,
                "response": dict (full API response)
            }
        """
        try:
            url = f"{self.BASE_URL}/transferrecipient"
            payload = {
                'type': 'nuban',
                'name': name,
                'account_number': account_number,
                'bank_code': bank_code,
                'currency': currency,
            }

            # Log the request details for debugging
            logger.info(
                f"[PAYSTACK DEBUG] Creating transfer recipient",
                extra={
                    'recipient_name': name,
                    'account_number': account_number[-4:],  # Mask for security
                    'bank_code': bank_code,
                    'currency': currency,
                    'account_name': name,
                }
            )

            response = requests.post(url, json=payload, headers=self._headers(), timeout=10)
            data = response.json()

            # Log response status
            logger.info(
                f"[PAYSTACK RESPONSE] Create recipient HTTP {response.status_code}",
                extra={
                    'http_status': response.status_code,
                    'api_status': data.get('status'),
                    'api_message': data.get('message'),
                    'error_code': data.get('code'),
                }
            )

            if response.status_code in [200, 201] and data.get('status'):
                recipient_code = data.get('data', {}).get('recipient_code')
                logger.info(
                    f"[PAYSTACK SUCCESS] Recipient created: {recipient_code}",
                    extra={'recipient_code': recipient_code}
                )
                return {
                    "status": True,
                    "recipient_code": recipient_code,
                    "response": data,
                }
            else:
                error_message = data.get('message', 'Unknown error')
                error_code = data.get('code', 'no_code')
                meta = data.get('meta', {})
                logger.warning(
                    f"[PAYSTACK ERROR] Recipient creation failed: {error_message}",
                    extra={
                        'paystack_message': error_message,
                        'paystack_code': error_code,
                        'paystack_meta': meta,
                        'full_response': data,
                    }
                )
                return {
                    "status": False,
                    "recipient_code": None,
                    "response": data,
                }

        except requests.exceptions.Timeout as e:
            logger.error(
                f"[PAYSTACK ERROR] Timeout creating recipient (likely SSL handshake)",
                extra={'error': str(e), 'account_number': account_number[-4:]}
            )
            return {
                "status": False,
                "recipient_code": None,
                "response": {"error": f"Timeout: {str(e)}"},
            }
        except requests.exceptions.RequestException as e:
            logger.error(
                f"[PAYSTACK ERROR] Network error creating recipient: {str(e)}",
                extra={'error': str(e), 'account_number': account_number[-4:]}
            )
            return {
                "status": False,
                "recipient_code": None,
                "response": {"error": str(e)},
            }
        except Exception as e:
            logger.error(
                f"[PAYSTACK ERROR] Unexpected error in create_transfer_recipient: {str(e)}",
                extra={'error': str(e), 'error_type': type(e).__name__}
            )
            return {
                "status": False,
                "recipient_code": None,
                "response": {"error": str(e)},
            }

    def initiate_transfer(self, amount, recipient_code, reference, reason=None):
        """
        Initiate a transfer to a recipient.

        Args:
            amount (int/float): Amount in Naira
            recipient_code (str): Paystack recipient code
            reference (str): Unique transfer reference (for idempotency)
            reason (str, optional): Reason for transfer

        Returns:
            dict: {
                "status": bool (success/failure),
                "transfer_code": str or None,
                "reference": str,
                "response": dict (full API response)
            }
        """
        try:
            # Convert Naira to Kobo (1 NGN = 100 Kobo)
            amount_in_kobo = int(float(amount) * 100)

            url = f"{self.BASE_URL}/transfer"
            payload = {
                'source': 'balance',
                'amount': amount_in_kobo,
                'recipient': recipient_code,
                'reference': reference,
            }

            if reason:
                payload['reason'] = reason

            logger.info(
                f"[PAYSTACK] Initiating transfer",
                extra={'reference': reference, 'recipient_code': recipient_code, 'amount': amount}
            )

            response = requests.post(url, json=payload, headers=self._headers(), timeout=10)
            data = response.json()

            logger.info(
                f"[PAYSTACK RESPONSE] HTTP {response.status_code}",
                extra={
                    'reference': reference,
                    'response_status': data.get('status'),
                    'response_message': data.get('message'),
                    'data_status': data.get('data', {}).get('status'),
                }
            )

            # Log full response for debugging (especially OTP cases)
            import json
            logger.debug(
                f"[PAYSTACK FULL RESPONSE] {reference}",
                extra={'full_response': json.dumps(data, indent=2, default=str)}
            )

            if response.status_code in [200, 201] and data.get('status'):
                transfer_code = data.get('data', {}).get('transfer_code')
                logger.info(
                    f"[PAYSTACK SUCCESS] Transfer initiated",
                    extra={
                        'reference': reference,
                        'transfer_code': transfer_code,
                        'paystack_status': data.get('data', {}).get('status')
                    }
                )
                return {
                    "status": True,
                    "transfer_code": transfer_code,
                    "reference": reference,
                    "response": data,
                }
            else:
                error_msg = data.get('message', 'Unknown error')
                logger.warning(
                    f"[PAYSTACK FAILED] Transfer initiation failed",
                    extra={
                        'reference': reference,
                        'http_code': response.status_code,
                        'api_status': data.get('status'),
                        'error_message': error_msg
                    }
                )
                return {
                    "status": False,
                    "transfer_code": None,
                    "reference": reference,
                    "response": data,
                }

        except requests.exceptions.RequestException as e:
            logger.error(
                f"[PAYSTACK ERROR] Network request failed",
                extra={'reference': reference, 'error': str(e)},
                exc_info=True
            )
            return {
                "status": False,
                "transfer_code": None,
                "reference": reference,
                "response": {"error": str(e)},
            }
        except Exception as e:
            logger.error(
                f"[PAYSTACK ERROR] Unexpected error in initiate_transfer",
                extra={'reference': reference, 'error': str(e)},
                exc_info=True
            )
            return {
                "status": False,
                "transfer_code": None,
                "reference": reference,
                "response": {"error": str(e)},
            }

    def verify_transfer(self, reference):
        """
        Verify the status of a transfer.

        Args:
            reference (str): Transfer reference

        Returns:
            dict: {
                "status": bool (success/failure),
                "data": dict (transfer data from Paystack or error info) 
            }
        """
        try:
            url = f"{self.BASE_URL}/transfer/verify/{reference}"
            response = requests.get(url, headers=self._headers(), timeout=10)
            data = response.json()

            if response.status_code == 200 and data.get('status'):
                return {
                    "status": True,
                    "data": data.get('data', {}),
                }
            else:
                logger.warning(f"Paystack transfer verification failed: {data}")
                return {
                    "status": False,
                    "data": data,
                }

        except requests.exceptions.RequestException as e:
            logger.error(f"Paystack API request error (verify): {str(e)}")
            return {
                "status": False,
                "data": {"error": str(e)},
            }
        except Exception as e:
            logger.error(f"Unexpected error in verify_transfer: {str(e)}")
            return {
                "status": False,
                "data": {"error": str(e)},
            }
