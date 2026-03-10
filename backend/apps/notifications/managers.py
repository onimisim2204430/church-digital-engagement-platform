"""Custom queryset and managers for notifications."""

from django.db import models


class NotificationQuerySet(models.QuerySet):
    """QuerySet helpers for filtering and bulk operations."""

    def unread(self):
        return self.filter(is_read=False)

    def for_user(self, user):
        return self.filter(user=user)

    def recent(self, limit=20):
        return self.order_by('-created_at')[:limit]

    def mark_all_read(self):
        return self.unread().update(is_read=True)


class NotificationManager(models.Manager.from_queryset(NotificationQuerySet)):
    """Notification manager with optimized aggregate helpers."""

    def unread_count(self, user) -> int:
        if not user or not getattr(user, 'is_authenticated', False):
            return 0
        return self.filter(user=user, is_read=False).count()

    def create_notification(self, **kwargs):
        return self.create(**kwargs)
