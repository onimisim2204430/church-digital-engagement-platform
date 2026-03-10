"""Database models for notifications."""

import uuid

from django.conf import settings
from django.db import models

from .constants import NotificationPriority, NotificationType, SourceModule
from .managers import NotificationManager


class Notification(models.Model):
    """Flexible user notification model for cross-module events."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        db_index=True,
    )
    notification_type = models.CharField(max_length=50, choices=NotificationType.choices, db_index=True)
    title = models.CharField(max_length=255)
    message = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False, db_index=True)
    priority = models.CharField(
        max_length=10,
        choices=NotificationPriority.choices,
        default=NotificationPriority.MEDIUM,
        db_index=True,
    )
    source_module = models.CharField(
        max_length=50,
        choices=SourceModule.choices,
        default=SourceModule.OTHER,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)

    objects = NotificationManager()

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', '-created_at'], name='notif_usr_read_cts_idx'),
            models.Index(fields=['notification_type', '-created_at'], name='notif_type_cts_idx'),
            models.Index(fields=['source_module', '-created_at'], name='notif_src_cts_idx'),
            models.Index(fields=['priority', '-created_at'], name='notif_pri_cts_idx'),
        ]

    def __str__(self) -> str:
        return f'{self.user_id} - {self.notification_type} - {self.title[:40]}'
