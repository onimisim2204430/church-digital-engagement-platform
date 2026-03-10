"""Utility helpers for notification access."""

from .models import Notification


def get_unread_count(user) -> int:
    """Return unread notification count for a user."""
    return Notification.objects.unread_count(user)


def get_recent_notifications(user, limit=10):
    """Return the recent notifications queryset for a user."""
    if not user or not getattr(user, 'is_authenticated', False):
        return Notification.objects.none()
    return Notification.objects.for_user(user).recent(limit=limit)
