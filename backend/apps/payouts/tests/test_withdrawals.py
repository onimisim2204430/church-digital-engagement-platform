import uuid
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.payouts.models import BankAccount, PayoutTransaction, WithdrawalRequest
from apps.users.models import UserRole

User = get_user_model()


class WithdrawalApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.user = User.objects.create_user(
            email='member@example.com',
            password='testpass123',
            first_name='Member',
            last_name='User',
            role=UserRole.MEMBER,
            is_active=True,
        )
        self.admin = User.objects.create_user(
            email='admin@example.com',
            password='testpass123',
            first_name='Admin',
            last_name='User',
            role=UserRole.ADMIN,
            is_staff=True,
            is_active=True,
        )

        self.bank_account = BankAccount.objects.create(
            user=self.user,
            account_name='John Doe',
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

    def test_user_submit_withdrawal_creates_pending(self):
        self.client.force_authenticate(user=self.user)

        payload = {
            'bank_account': str(self.bank_account.id),
            'amount': '2500.00',
            'currency': 'NGN',
        }
        response = self.client.post('/api/withdrawals/', payload, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['status'], 'pending')
        self.assertEqual(response.data['currency'], 'NGN')
        self.assertIn('id', response.data)

        created = WithdrawalRequest.objects.get(id=response.data['id'])
        self.assertEqual(created.user_id, self.user.id)
        self.assertEqual(created.status, 'pending')

    def test_user_list_withdrawals_returns_only_owned_records(self):
        other_user = User.objects.create_user(
            email='other@example.com',
            password='testpass123',
            role=UserRole.MEMBER,
            is_active=True,
        )
        other_account = BankAccount.objects.create(
            user=other_user,
            account_name='Other User',
            account_number='1111222233',
            bank_code='044',
            bank_name='Access Bank',
            is_verified=True,
        )
        WithdrawalRequest.objects.create(
            user=other_user,
            bank_account=other_account,
            amount=Decimal('999.99'),
            currency='NGN',
            status='pending',
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/withdrawals/')

        self.assertEqual(response.status_code, 200)
        self.assertIn('results', response.data)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], str(self.pending_withdrawal.id))

    def test_admin_list_all_withdrawals(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/admin/withdrawals/')

        self.assertEqual(response.status_code, 200)
        self.assertIn('results', response.data)
        self.assertGreaterEqual(response.data['count'], 1)
        returned_ids = [row['id'] for row in response.data['results']]
        self.assertIn(str(self.pending_withdrawal.id), returned_ids)

    @patch(
        'apps.payouts.services.payout_engine.PaystackService.create_transfer_recipient',
        return_value={
            'status': True,
            'recipient_code': 'RCP_123456',
            'response': {},
        },
    )
    @patch(
        'apps.payouts.services.payout_engine.PaystackService.initiate_transfer',
        return_value={
            'status': True,
            'transfer_code': 'TRF_123456',
            'reference': 'WDR-XXXXXX',
            'response': {
                'data': {
                    'status': 'success',
                    'reference': 'WDR-XXXXXX',
                }
            },
        },
    )
    def test_admin_approve_withdrawal_processes_successfully(
        self,
        mock_initiate_transfer,
        mock_create_recipient,
    ):
        self.client.force_authenticate(user=self.admin)

        with self.assertLogs('apps.payouts.viewsets', level='INFO') as viewset_logs:
            with self.assertLogs('apps.payouts.services.payout_engine', level='INFO') as engine_logs:
                response = self.client.post(
                    f'/api/admin/withdrawals/{self.pending_withdrawal.id}/approve/',
                    data={},
                    format='json',
                )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            set(response.data.keys()),
            {'status', 'transaction_id', 'message', 'withdrawal'},
        )
        self.assertTrue(response.data['status'])
        self.assertIsNotNone(response.data['transaction_id'])

        self.pending_withdrawal.refresh_from_db()
        self.bank_account.refresh_from_db()

        self.assertEqual(self.pending_withdrawal.status, 'completed')
        self.assertIsNotNone(self.pending_withdrawal.processed_at)
        self.assertEqual(self.bank_account.recipient_code, 'RCP_123456')

        transaction = PayoutTransaction.objects.get(withdrawal=self.pending_withdrawal)
        self.assertEqual(transaction.paystack_transfer_code, 'TRF_123456')
        self.assertEqual(transaction.status, 'success')

        self.assertEqual(mock_create_recipient.call_count, 1)
        self.assertEqual(mock_initiate_transfer.call_count, 1)

        self.assertTrue(any('Admin approving withdrawal' in line for line in viewset_logs.output))
        self.assertTrue(any('Processing withdrawal' in line for line in engine_logs.output))

    @patch(
        'apps.payouts.services.payout_engine.BankAccount.objects.get',
        side_effect=BankAccount.DoesNotExist,
    )
    def test_admin_approve_with_missing_bank_account_fails_gracefully(self, _mock_bank_get):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            f'/api/admin/withdrawals/{self.pending_withdrawal.id}/approve/',
            data={},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data['status'])
        self.assertEqual(response.data['transaction_id'], None)
        self.assertIn('Bank account not found', response.data['message'])

        self.pending_withdrawal.refresh_from_db()
        self.assertEqual(self.pending_withdrawal.status, 'failed')
        self.assertIn('Bank account not found', self.pending_withdrawal.failure_reason)
        self.assertEqual(PayoutTransaction.objects.filter(withdrawal=self.pending_withdrawal).count(), 0)

    def test_admin_approve_already_completed_withdrawal_is_blocked(self):
        self.pending_withdrawal.status = 'completed'
        self.pending_withdrawal.save(update_fields=['status', 'updated_at'])

        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f'/api/admin/withdrawals/{self.pending_withdrawal.id}/approve/',
            data={},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data['status'])
        self.assertIsNone(response.data['transaction_id'])
        self.assertIn('already completed', response.data['message'])
        self.assertEqual(PayoutTransaction.objects.filter(withdrawal=self.pending_withdrawal).count(), 0)
