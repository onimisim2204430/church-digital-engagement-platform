"""Basic tests for payments app endpoints and safety checks."""

import hashlib
import hmac
import json
from unittest.mock import patch

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from .models import PaymentStatus, PaymentTransaction


@override_settings(ROOT_URLCONF='config.urls')
class PaymentFlowTests(TestCase):
    """Covers initialization, verification, and webhook signature validation."""

    def setUp(self) -> None:
        self.client = APIClient()
        self.base_url = '/api/v1/payments/'

    @patch('apps.payments.views.initialize_transaction')
    def test_payment_initialization(self, mock_initialize) -> None:
        """Initialize endpoint creates pending transaction and returns redirect URL."""
        mock_initialize.return_value = {
            'authorization_url': 'https://checkout.paystack.com/mock-auth',
            'access_code': 'access-code',
            'reference': 'PAY_TEST_001',
        }

        response = self.client.post(
            f'{self.base_url}initialize/',
            {
                'email': 'payer@example.com',
                'amount': 500000,
                'reference': 'PAY_TEST_001',
                'metadata': {'source': 'unit-test'},
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(PaymentTransaction.objects.filter(reference='PAY_TEST_001').exists())
        transaction = PaymentTransaction.objects.get(reference='PAY_TEST_001')
        self.assertEqual(transaction.status, PaymentStatus.PENDING)
        self.assertEqual(response.data['authorization_url'], 'https://checkout.paystack.com/mock-auth')

    @override_settings()
    def test_webhook_validation(self) -> None:
        """Webhook endpoint rejects payloads with invalid signatures."""
        payload = {'event': 'charge.success', 'data': {'reference': 'PAY_TEST_WEBHOOK'}}
        response = self.client.post(
            f'{self.base_url}webhook/paystack/',
            data=json.dumps(payload),
            content_type='application/json',
            HTTP_X_PAYSTACK_SIGNATURE='invalid-signature',
        )
        self.assertEqual(response.status_code, 400)

    @patch('apps.payments.views.verify_transaction')
    def test_payment_verification(self, mock_verify) -> None:
        """Verify endpoint updates pending transaction to success on valid Paystack data."""
        transaction = PaymentTransaction.objects.create(
            email='payer@example.com',
            amount=500000,
            currency='NGN',
            reference='PAY_TEST_VERIFY',
            status=PaymentStatus.PENDING,
        )

        mock_verify.return_value = {
            'reference': transaction.reference,
            'status': 'success',
            'channel': 'card',
            'gateway_response': 'Approved',
            'paid_at': '2026-03-05T10:00:00Z',
            'currency': 'NGN',
            'amount': 500000,
        }

        response = self.client.get(f'{self.base_url}verify/{transaction.reference}/')
        self.assertEqual(response.status_code, 200)

        transaction.refresh_from_db()
        self.assertEqual(transaction.status, PaymentStatus.SUCCESS)
        self.assertEqual(transaction.payment_method, 'card')
        self.assertIsNotNone(transaction.paid_at)


@override_settings(ROOT_URLCONF='config.urls')
class WebhookSignatureSuccessTests(TestCase):
    """Additional signature validation behavior tests."""

    @patch('apps.payments.webhooks.verify_transaction')
    def test_valid_webhook_signature(self, mock_verify) -> None:
        """Valid webhook signature processes charge.success safely."""
        PaymentTransaction.objects.create(
            email='payer@example.com',
            amount=250000,
            currency='NGN',
            reference='PAY_TEST_VALID_WEBHOOK',
            status=PaymentStatus.PENDING,
        )

        mock_verify.return_value = {
            'reference': 'PAY_TEST_VALID_WEBHOOK',
            'status': 'success',
            'channel': 'bank',
            'gateway_response': 'Successful',
            'paid_at': '2026-03-05T10:00:00Z',
            'currency': 'NGN',
            'amount': 250000,
        }

        payload = {'event': 'charge.success', 'data': {'reference': 'PAY_TEST_VALID_WEBHOOK'}}
        body = json.dumps(payload).encode('utf-8')
        secret = 'webhook-secret-for-tests'
        signature = hmac.new(secret.encode('utf-8'), body, hashlib.sha512).hexdigest()

        with patch.dict('os.environ', {'PAYSTACK_WEBHOOK_SECRET': secret}):
            response = self.client.post(
                '/api/v1/payments/webhook/paystack/',
                data=body,
                content_type='application/json',
                HTTP_X_PAYSTACK_SIGNATURE=signature,
            )

        self.assertEqual(response.status_code, 200)
        transaction = PaymentTransaction.objects.get(reference='PAY_TEST_VALID_WEBHOOK')
        self.assertEqual(transaction.status, PaymentStatus.SUCCESS)
