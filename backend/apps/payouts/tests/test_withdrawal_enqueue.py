from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.payouts.models import BankAccount, WithdrawalRequest
from apps.users.models import UserRole

User = get_user_model()


class WithdrawalEnqueueTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.user = User.objects.create_user(
            email='enqueue-member@example.com',
            password='testpass123',
            first_name='Member',
            last_name='Queue',
            role=UserRole.MEMBER,
            is_active=True,
        )
        self.admin = User.objects.create_user(
            email='enqueue-admin@example.com',
            password='testpass123',
            first_name='Admin',
            last_name='Queue',
            role=UserRole.ADMIN,
            is_active=True,
            is_staff=True,
            is_superuser=True,
        )

        self.bank_account = BankAccount.objects.create(
            user=self.user,
            account_name='Queue User',
            account_number='0123456789',
            bank_code='058',
            bank_name='GTBank',
            is_verified=True,
        )

        self.pending_withdrawal = WithdrawalRequest.objects.create(
            user=self.user,
            bank_account=self.bank_account,
            amount=Decimal('1500.00'),
            currency='NGN',
            status='pending',
        )

        self.pending_missing_bank_withdrawal = WithdrawalRequest.objects.create(
            user=self.user,
            bank_account=self.bank_account,
            amount=Decimal('1700.00'),
            currency='NGN',
            status='pending',
        )

    @patch('apps.payouts.tasks.process_withdrawal_task.delay')
    def test_admin_approve_enqueues_task_and_sets_processing(self, mock_delay):
        self.client.force_authenticate(user=self.admin)
        admin_approve_url = f'/api/admin/withdrawals/{self.pending_withdrawal.id}/approve/'

        response = self.client.post(admin_approve_url, data={}, format='json')

        self.assertIn(response.status_code, [200, 202], 'Approve should return queued success status.')
        self.assertEqual(response.data.get('status'), 'queued')
        self.assertEqual(response.data.get('message'), 'Withdrawal queued for processing')

        mock_delay.assert_called_once_with(str(self.pending_withdrawal.id))

        self.pending_withdrawal.refresh_from_db()
        self.assertEqual(
            self.pending_withdrawal.status,
            'processing',
            'Withdrawal should be in processing state after enqueue.',
        )

        self.assertIn('withdrawal', response.data)
        self.assertEqual(response.data['withdrawal']['id'], str(self.pending_withdrawal.id))

    @patch('apps.payouts.tasks.process_withdrawal_task.delay')
    def test_admin_approve_with_missing_bank_account_still_enqueues(self, mock_delay):
        # Approve endpoint should only queue work and not run heavy payout validation synchronously.
        # Missing-bank-account cases are handled later by the background worker/engine.
        self.client.force_authenticate(user=self.admin)
        admin_approve_url = f'/api/admin/withdrawals/{self.pending_missing_bank_withdrawal.id}/approve/'

        response = self.client.post(admin_approve_url, data={}, format='json')

        self.assertIn(response.status_code, [200, 202], 'Approve should queue even if bank account may fail later.')
        self.assertEqual(response.data.get('status'), 'queued')
        self.assertEqual(response.data.get('message'), 'Withdrawal queued for processing')

        mock_delay.assert_called_once_with(str(self.pending_missing_bank_withdrawal.id))

        self.pending_missing_bank_withdrawal.refresh_from_db()
        self.assertEqual(
            self.pending_missing_bank_withdrawal.status,
            'processing',
            'Approve flow should only enqueue and move to processing; worker handles validation failures.',
        )

        self.assertIn('withdrawal', response.data)
        self.assertEqual(response.data['withdrawal']['id'], str(self.pending_missing_bank_withdrawal.id))

    def test_user_submit_and_list_unaffected_by_enqueue_changes(self):
        self.client.force_authenticate(user=self.user)

        create_response = self.client.post(
            '/api/withdrawals/',
            {
                'bank_account': str(self.bank_account.id),
                'amount': '2500.00',
                'currency': 'NGN',
            },
            format='json',
        )

        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(create_response.data.get('status'), 'pending')

        list_response = self.client.get('/api/withdrawals/')
        self.assertEqual(list_response.status_code, 200)

        payload = list_response.data
        results = payload.get('results') if isinstance(payload, dict) else payload
        self.assertIsInstance(results, list)

        returned_ids = {item['id'] for item in results}
        self.assertIn(str(self.pending_withdrawal.id), returned_ids)
        self.assertIn(str(self.pending_missing_bank_withdrawal.id), returned_ids)
        self.assertIn(str(create_response.data['id']), returned_ids)


# Run with:
# python manage.py test apps.payouts.tests.test_withdrawal_enqueue -v 2
