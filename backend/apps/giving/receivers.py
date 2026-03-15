"""Signal receivers for giving-related side effects."""

from django.db.models import F
from django.dispatch import receiver
from django.utils import timezone

from apps.payments.signals import payment_successful
from .models import GivingItem


@receiver(payment_successful)
def update_giving_progress(sender, payment_transaction=None, **kwargs):
    """
    When a payment succeeds, increment the corresponding giving item's totals.

    Relies on checkout metadata to identify which giving option was funded.
    """
    if not payment_transaction:
        return

    metadata = getattr(payment_transaction, 'metadata', {}) or {}
    giving_id = metadata.get('giving_option_id')
    amount = getattr(payment_transaction, 'amount', 0) or 0

    if not giving_id or amount <= 0:
        return

    now = timezone.now()

    GivingItem.objects.filter(id=giving_id).update(
        raised_amount=F('raised_amount') + amount,
        total_donations=F('total_donations') + 1,
        updated_at=now,
    )
    
    # Check if project is now 100% funded and auto-complete it
    try:
        giving_item = GivingItem.objects.get(id=giving_id)
        if (giving_item.goal_amount and 
            giving_item.raised_amount >= giving_item.goal_amount and
            giving_item.status != 'completed'):
            giving_item.status = 'completed'
            giving_item.save(update_fields=['status', 'updated_at'])
    except GivingItem.DoesNotExist:
        pass
