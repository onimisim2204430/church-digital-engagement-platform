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

            response = requests.post(url, json=payload, headers=self._headers(), timeout=10)
            data = response.json()

            if response.status_code in [200, 201] and data.get('status'):
                recipient_code = data.get('data', {}).get('recipient_code')
                return {
                    "status": True,
                    "recipient_code": recipient_code,
                    "response": data,
                }
            else:
                logger.warning(f"Paystack recipient creation failed: {data}")
                return {
                    "status": False,
                    "recipient_code": None,
                    "response": data,
                }

        except requests.exceptions.RequestException as e:
            logger.error(f"Paystack API request error (recipient): {str(e)}")
            return {
                "status": False,
                "recipient_code": None,
                "response": {"error": str(e)},
            }
        except Exception as e:
            logger.error(f"Unexpected error in create_transfer_recipient: {str(e)}")
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

            response = requests.post(url, json=payload, headers=self._headers(), timeout=10)
            data = response.json()

            if response.status_code in [200, 201] and data.get('status'):
                transfer_code = data.get('data', {}).get('transfer_code')
                return {
                    "status": True,
                    "transfer_code": transfer_code,
                    "reference": reference,
                    "response": data,
                }
            else:
                logger.warning(f"Paystack transfer initiation failed: {data}")
                return {
                    "status": False,
                    "transfer_code": None,
                    "reference": reference,
                    "response": data,
                }

        except requests.exceptions.RequestException as e:
            logger.error(f"Paystack API request error (transfer): {str(e)}")
            return {
                "status": False,
                "transfer_code": None,
                "reference": reference,
                "response": {"error": str(e)},
            }
        except Exception as e:
            logger.error(f"Unexpected error in initiate_transfer: {str(e)}")
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
