"""Backfill recurring giving plans from historical payment transactions."""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models import Q

from apps.giving.models import GivingItem
from apps.payments.models import (
    PaymentTransaction,
    RecurringFrequency,
    RecurringGivingPlan,
    RecurringPlanStatus,
)


class Command(BaseCommand):
    help = 'Create recurring plan tracker records from legacy transactions with recurring metadata.'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Preview without persisting changes')

    def handle(self, *args, **options):
        dry_run = bool(options.get('dry_run'))

        recurring_q = Q(metadata__recurring=True) | Q(metadata__recurring='true')
        queryset = (
            PaymentTransaction.objects.filter(recurring_q)
            .select_related('user')
            .order_by('created_at')
        )

        created_count = 0
        skipped_count = 0
        updated_count = 0

        for tx in queryset.iterator():
            if tx.user is None:
                skipped_count += 1
                continue

            metadata = tx.metadata or {}
            giving_item = self._resolve_giving_item(metadata)
            giving_title = (
                str(metadata.get('giving_option_title', '')).strip()
                or (giving_item.title if giving_item else '')
                or 'General Fund'
            )

            started_at = tx.paid_at or tx.created_at
            next_payment_at = self._compute_next_payment(started_at, RecurringFrequency.MONTHLY)

            lookup = {
                'user': tx.user,
                'email': tx.email,
                'giving_item': giving_item,
                'amount': tx.amount,
                'currency': tx.currency,
                'frequency': RecurringFrequency.MONTHLY,
            }

            defaults = {
                'giving_title': giving_title,
                'status': RecurringPlanStatus.ACTIVE,
                'next_payment_at': next_payment_at,
                'last_payment_at': tx.paid_at,
                'started_at': started_at,
                'paystack_plan_code': metadata.get('paystack_plan_code') or None,
                'paystack_subscription_code': metadata.get('paystack_subscription_code') or None,
                'source_transaction': tx,
                'inferred_from_metadata': True,
                'confidence_level': 'HIGH' if giving_item is not None else 'MEDIUM',
                'metadata': {
                    'backfilled_from_reference': tx.reference,
                    'legacy_metadata': metadata,
                },
            }

            if dry_run:
                exists = RecurringGivingPlan.objects.filter(**lookup).exists()
                if exists:
                    updated_count += 1
                else:
                    created_count += 1
                continue

            plan, created = RecurringGivingPlan.objects.update_or_create(
                **lookup,
                defaults=defaults,
            )

            if created:
                created_count += 1
            else:
                updated_count += 1
                if plan.source_transaction_id is None:
                    plan.source_transaction = tx
                    plan.save(update_fields=['source_transaction', 'updated_at'])

        self.stdout.write(self.style.SUCCESS('Recurring plan backfill complete'))
        self.stdout.write(f'Created: {created_count}')
        self.stdout.write(f'Updated: {updated_count}')
        self.stdout.write(f'Skipped: {skipped_count}')
        if dry_run:
            self.stdout.write(self.style.WARNING('Dry run mode: no records were written.'))

    @staticmethod
    def _resolve_giving_item(metadata):
        giving_item_id = metadata.get('giving_option_id')
        if not giving_item_id:
            return None
        try:
            return GivingItem.objects.filter(id=giving_item_id).first()
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _compute_next_payment(started_at, frequency: str):
        if not started_at:
            return None

        if frequency == RecurringFrequency.WEEKLY:
            return started_at + timedelta(days=7)
        if frequency == RecurringFrequency.BI_WEEKLY:
            return started_at + timedelta(days=14)
        if frequency == RecurringFrequency.QUARTERLY:
            return started_at + timedelta(days=91)
        if frequency == RecurringFrequency.YEARLY:
            return started_at + timedelta(days=365)
        return started_at + timedelta(days=30)
