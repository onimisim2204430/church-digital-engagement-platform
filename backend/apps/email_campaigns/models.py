"""
Email Campaign Models
Handles email subscriptions and bulk email campaigns
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class EmailSubscription(models.Model):
    """
    User email subscription for campaigns
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='email_subscription'
    )
    is_subscribed = models.BooleanField(default=True)
    subscribed_at = models.DateTimeField(auto_now_add=True)
    unsubscribed_at = models.DateTimeField(null=True, blank=True)
    
    # Subscription preferences
    receive_sermons = models.BooleanField(default=True)
    receive_announcements = models.BooleanField(default=True)
    receive_devotionals = models.BooleanField(default=True)
    receive_events = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-subscribed_at']
    
    def __str__(self):
        status = "Subscribed" if self.is_subscribed else "Unsubscribed"
        return f"{self.user.email} - {status}"
    
    def unsubscribe(self):
        """Unsubscribe from all emails"""
        self.is_subscribed = False
        self.unsubscribed_at = timezone.now()
        self.save()
    
    def resubscribe(self):
        """Resubscribe to emails"""
        self.is_subscribed = True
        self.unsubscribed_at = None
        self.save()


class CampaignStatus(models.TextChoices):
    """Email campaign status"""
    DRAFT = 'DRAFT', 'Draft'
    SCHEDULED = 'SCHEDULED', 'Scheduled'
    SENDING = 'SENDING', 'Sending'
    SENT = 'SENT', 'Sent'
    FAILED = 'FAILED', 'Failed'


class EmailCampaign(models.Model):
    """
    Bulk email campaign sent by admins
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='email_campaigns'
    )
    
    # Campaign details
    subject = models.CharField(max_length=255)
    content = models.TextField()
    html_content = models.TextField(blank=True)  # Rich HTML version
    
    # Targeting
    send_to_all = models.BooleanField(default=False)
    send_to_members_only = models.BooleanField(default=False)
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=CampaignStatus.choices,
        default=CampaignStatus.DRAFT
    )
    
    # Scheduling
    scheduled_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    
    # Analytics
    total_recipients = models.IntegerField(default=0)
    total_sent = models.IntegerField(default=0)
    total_delivered = models.IntegerField(default=0)
    total_opened = models.IntegerField(default=0)
    total_failed = models.IntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['created_by', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.subject} - {self.get_status_display()}"


class EmailLog(models.Model):
    """
    Individual email send log for tracking
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign = models.ForeignKey(
        EmailCampaign,
        on_delete=models.CASCADE,
        related_name='email_logs'
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_emails'
    )
    
    # Status
    is_sent = models.BooleanField(default=False)
    is_delivered = models.BooleanField(default=False)
    is_opened = models.BooleanField(default=False)
    is_failed = models.BooleanField(default=False)
    
    # Error tracking
    error_message = models.TextField(blank=True)
    
    # Timestamps
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    opened_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['campaign', 'recipient']),
            models.Index(fields=['is_opened', '-opened_at']),
        ]
    
    def __str__(self):
        return f"{self.campaign.subject} to {self.recipient.email}"
