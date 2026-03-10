"""Notification constants and choices."""

from django.db import models


class NotificationType(models.TextChoices):
    PAYMENT_SUCCESS = 'PAYMENT_SUCCESS', 'Payment Success'
    PAYMENT_FAILED = 'PAYMENT_FAILED', 'Payment Failed'
    SYSTEM_ALERT = 'SYSTEM_ALERT', 'System Alert'
    ADMIN_MESSAGE = 'ADMIN_MESSAGE', 'Admin Message'
    SECURITY_EVENT = 'SECURITY_EVENT', 'Security Event'
    ROLE_UPDATED = 'ROLE_UPDATED', 'Role Updated'
    PERMISSIONS_UPDATED = 'PERMISSIONS_UPDATED', 'Permissions Updated'


class NotificationPriority(models.TextChoices):
    LOW = 'LOW', 'Low'
    MEDIUM = 'MEDIUM', 'Medium'
    HIGH = 'HIGH', 'High'
    CRITICAL = 'CRITICAL', 'Critical'


class SourceModule(models.TextChoices):
    PAYMENT = 'payment', 'Payment'
    SECURITY = 'security', 'Security'
    ADMIN = 'admin', 'Admin'
    SYSTEM = 'system', 'System'
    CONTENT = 'content', 'Content'
    USER = 'user', 'User'
    OTHER = 'other', 'Other'
