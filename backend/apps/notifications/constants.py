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
    # Series subscription & announcement
    SERIES_ANNOUNCEMENT = 'SERIES_ANNOUNCEMENT', 'Series Announcement'
    SERIES_SUBSCRIPTION_CONFIRMED = 'SERIES_SUBSCRIPTION_CONFIRMED', 'Series Subscription Confirmed'
    SERIES_REQUEST_SUBMITTED = 'SERIES_REQUEST_SUBMITTED', 'Series Request Submitted'
    SERIES_APPROVAL_NEEDED = 'SERIES_APPROVAL_NEEDED', 'Series Approval Needed'
    SERIES_REQUEST_APPROVED = 'SERIES_REQUEST_APPROVED', 'Series Request Approved'
    SERIES_REQUEST_REJECTED = 'SERIES_REQUEST_REJECTED', 'Series Request Rejected'
    SERIES_DELIVERY_COMPLETED = 'SERIES_DELIVERY_COMPLETED', 'Series Delivery Completed'
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
