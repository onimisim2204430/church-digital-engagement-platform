"""
Paystack helper functions for OTP confirmation and other operations.
"""
import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def confirm_transfer_otp(transfer_code, otp):
    """
    Finalize a Paystack transfer using OTP.
    
    This is used when Paystack requires OTP confirmation for a transfer.
    
    Args:
        transfer_code (str): The Paystack transfer code (e.g., "TRF_xxx")
        otp (str): The OTP code received from Paystack
    
    Returns:
        tuple: (success: bool, transfer_code: str or None, message: str)
    """
    try:
        secret_key = getattr(settings, 'PAYSTACK_SECRET_KEY', None)
        if not secret_key:
            logger.error("PAYSTACK_SECRET_KEY not configured in settings")
            return False, None, "Paystack API key not configured"
        
        url = "https://api.paystack.co/transfer/finalize_transfer"
        headers = {
            'Authorization': f'Bearer {secret_key}',
            'Content-Type': 'application/json',
        }
        payload = {
            'transfer_code': transfer_code,
            'otp': otp,
        }
        
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        data = response.json()
        
        if response.status_code in [200, 201] and data.get('status'):
            logger.info(f"Transfer finalized successfully: {transfer_code}")
            return True, transfer_code, data.get('message', 'Transfer completed successfully')
        else:
            error_msg = data.get('message', 'OTP confirmation failed')
            logger.warning(f"Transfer finalization failed for {transfer_code}: {error_msg}")
            return False, None, error_msg
    
    except requests.exceptions.RequestException as e:
        logger.error(f"Paystack API request error (finalize_transfer): {str(e)}")
        return False, None, f"Network error: {str(e)}"
    except Exception as e:
        logger.error(f"Unexpected error in confirm_transfer_otp: {str(e)}")
        return False, None, f"Unexpected error: {str(e)}"


def verify_transfer_status(transfer_code):
    """
    Verify the current status of a Paystack transfer by calling the Paystack API.

    Args:
        transfer_code (str): Paystack transfer code (e.g. "TRF_xxxx")

    Returns:
        tuple: (success: bool, transfer_status: str or None, transfer_data: dict)
               transfer_status values from Paystack: 'success', 'pending', 'failed', 'otp', etc.
    """
    try:
        secret_key = getattr(settings, 'PAYSTACK_SECRET_KEY', None)
        if not secret_key:
            logger.error("PAYSTACK_SECRET_KEY not configured")
            return False, None, {}

        url = f"https://api.paystack.co/transfer/{transfer_code}"
        headers = {
            'Authorization': f'Bearer {secret_key}',
            'Content-Type': 'application/json',
        }

        response = requests.get(url, headers=headers, timeout=10)
        data = response.json()

        if response.status_code == 200 and data.get('status'):
            transfer_data = data.get('data', {})
            paystack_status = str(transfer_data.get('status', '')).lower()
            logger.info(f"Verified transfer {transfer_code}: status={paystack_status}")
            return True, paystack_status, transfer_data
        else:
            error_msg = data.get('message', 'Failed to verify transfer')
            logger.warning(f"Transfer verification failed for {transfer_code}: {error_msg}")
            return False, None, data

    except requests.exceptions.RequestException as e:
        logger.error(f"Paystack API request error (verify_transfer): {str(e)}")
        return False, None, {}
    except Exception as e:
        logger.error(f"Unexpected error in verify_transfer_status: {str(e)}")
        return False, None, {}
