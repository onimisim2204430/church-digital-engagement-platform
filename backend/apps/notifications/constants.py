"""Notification constants and choices."""

from django.db import models


class NotificationType(models.TextChoices):
    PAYMENT_SUCCESS = 'PAYMENT_SUCCESS', 'Payment Success'
    PAYMENT_FAILED = 'PAYMENT_FAILED', 'Payment Failed'
    WITHDRAWAL_INITIATED = 'WITHDRAWAL_INITIATED', 'Withdrawal Initiated'
    WITHDRAWAL_APPROVED = 'WITHDRAWAL_APPROVED', 'Withdrawal Approved'
    WITHDRAWAL_PROCESSING = 'WITHDRAWAL_PROCESSING', 'Withdrawal Processing'
    WITHDRAWAL_OTP_REQUIRED = 'WITHDRAWAL_OTP_REQUIRED', 'Withdrawal OTP Required'
    WITHDRAWAL_COMPLETED = 'WITHDRAWAL_COMPLETED', 'Withdrawal Completed'
    WITHDRAWAL_FAILED = 'WITHDRAWAL_FAILED', 'Withdrawal Failed'
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
