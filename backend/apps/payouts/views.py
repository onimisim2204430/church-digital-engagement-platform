import hashlib
import hmac
import json
import logging

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.payouts.models import PayoutTransaction, WithdrawalRequest
from apps.payouts.tasks import process_withdrawal_task

logger = logging.getLogger(__name__)


def enqueue_withdrawal(withdrawal: WithdrawalRequest) -> None:
	"""Queue payout processing for a withdrawal in Celery."""
	# Keep explicit processing status while async worker picks up the job.
	withdrawal.status = 'processing'
	withdrawal.updated_at = timezone.now()
	withdrawal.save(update_fields=['status', 'updated_at'])
	process_withdrawal_task.delay(str(withdrawal.id))


class PaystackWebhookView(APIView):
	"""Receives Paystack transfer webhooks and updates payout state idempotently."""

	authentication_classes = []
	permission_classes = []

	def post(self, request, *args, **kwargs):
		body = request.body or b''
		signature = request.META.get('HTTP_X_PAYSTACK_SIGNATURE')
		secret = getattr(settings, 'PAYSTACK_SECRET_KEY', '')

		if not secret:
			logger.warning('Paystack webhook rejected: secret not configured')
			return Response({'detail': 'Webhook secret not configured'}, status=status.HTTP_400_BAD_REQUEST)

		if not signature:
			logger.warning('Paystack webhook rejected: signature missing')
			return Response({'detail': 'Missing signature'}, status=status.HTTP_400_BAD_REQUEST)

		computed = hmac.new(secret.encode(), msg=body, digestmod=hashlib.sha512).hexdigest()
		if not hmac.compare_digest(signature, computed):
			logger.warning('Paystack webhook rejected: signature mismatch')
			return Response({'detail': 'Invalid signature'}, status=status.HTTP_400_BAD_REQUEST)

		try:
			payload = json.loads(body.decode('utf-8')) if body else {}
		except Exception:
			logger.exception('Paystack webhook had invalid JSON payload')
			# Valid signature but malformed payload should still return 200 to stay idempotent.
			return Response({'status': 'ignored'}, status=status.HTTP_200_OK)

		event = str(payload.get('event') or '').lower()
		if not event.startswith('transfer.'):
			return Response({'status': 'ignored'}, status=status.HTTP_200_OK)

		data = payload.get('data') or {}
		reference = data.get('reference')
		transfer_code = data.get('transfer_code')

		if not reference and not transfer_code:
			logger.info('Paystack transfer webhook missing identifiers', extra={'event': event})
			return Response({'status': 'ignored'}, status=status.HTTP_200_OK)

		try:
			with transaction.atomic():
				# Idempotency: lock transaction row while mutating status/payload.
				tx_queryset = PayoutTransaction.objects.select_for_update().select_related('withdrawal')
				payout_tx = None
				if reference:
					payout_tx = tx_queryset.filter(paystack_reference=reference).first()
				if not payout_tx and transfer_code:
					payout_tx = tx_queryset.filter(paystack_transfer_code=transfer_code).first()

				if not payout_tx:
					logger.info(
						'Payout transaction not found for webhook',
						extra={'reference': reference, 'transfer_code': transfer_code, 'event': event},
					)
					return Response({'status': 'ok'}, status=status.HTTP_200_OK)


				# Tests to create later:
				# - Unit tests for webhook signature verification and transfer event handling.
				# - Webhook idempotency tests for duplicate deliveries and payload merge behavior.

				existing_payload = payout_tx.response_payload if isinstance(payout_tx.response_payload, dict) else {}
				history = list(existing_payload.get('webhook_history', []))
				history.append({
					'event': event,
					'received_at': timezone.now().isoformat(),
					'reference': reference,
					'transfer_code': transfer_code,
				})
				merged_payload = {
					**existing_payload,
					'last_webhook_event': event,
					'last_webhook_data': data,
					'webhook_history': history,
				}

				withdrawal = WithdrawalRequest.objects.select_for_update().get(id=payout_tx.withdrawal_id)

				success_events = {'transfer.success'}
				failure_events = {'transfer.failed', 'transfer.failed.chargeback'}

				if event in success_events:
					payout_tx.status = 'success'
					payout_tx.response_payload = merged_payload
					payout_tx.save(update_fields=['status', 'response_payload'])

					if withdrawal.status != 'completed':
						withdrawal.status = 'completed'
					if not withdrawal.processed_at:
						withdrawal.processed_at = timezone.now()
					withdrawal.updated_at = timezone.now()
					withdrawal.save(update_fields=['status', 'processed_at', 'updated_at'])

					# TODO: Add delayed reconciliation with verify_transfer if webhook does not arrive within X minutes.
					logger.info('Processed successful payout webhook', extra={'withdrawal_id': str(withdrawal.id)})
				elif event in failure_events:
					payout_tx.status = 'failed'
					payout_tx.response_payload = merged_payload
					payout_tx.save(update_fields=['status', 'response_payload'])

					failure_reason = (
						str(data.get('message'))
						or str(data.get('status'))
						or 'Transfer failed via webhook'
					)
					withdrawal.status = 'failed'
					withdrawal.failure_reason = failure_reason[:2000]
					withdrawal.updated_at = timezone.now()
					withdrawal.save(update_fields=['status', 'failure_reason', 'updated_at'])
					logger.info('Processed failed payout webhook', extra={'withdrawal_id': str(withdrawal.id)})
				else:
					payout_tx.response_payload = merged_payload
					payout_tx.save(update_fields=['response_payload'])

		except Exception:
			logger.exception('Error while processing Paystack webhook', exc_info=True)
			return Response({'status': 'ok'}, status=status.HTTP_200_OK)

		return Response({'status': 'ok'}, status=status.HTTP_200_OK)
