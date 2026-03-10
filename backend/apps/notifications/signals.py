"""Internal notification domain signals (not externally connected yet)."""

from django.dispatch import Signal


payment_success = Signal()
payment_failed = Signal()
