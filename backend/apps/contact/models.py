"""
Contact Message Models

Handles public/member contact form submissions with:
- Category routing (maps to Gmail aliases)
- Admin reply workflow
- Status lifecycle (NEW → IN_PROGRESS → REPLIED → CLOSED)
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class ContactCategory(models.TextChoices):
    GENERAL = 'GENERAL', 'General'
    SUPPORT = 'SUPPORT', 'Support'
    PRAYER = 'PRAYER', 'Prayer'
    TECHNICAL = 'TECHNICAL', 'Technical'
    FINANCE = 'FINANCE', 'Finance'
    PARTNERSHIP = 'PARTNERSHIP', 'Partnership'


class ContactStatus(models.TextChoices):
    NEW = 'NEW', 'New'
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    REPLIED = 'REPLIED', 'Replied'
    CLOSED = 'CLOSED', 'Closed'


class ContactMessage(models.Model):
    """
    A contact form submission from a public visitor or authenticated member.
    Sender identity is snapshotted at submission time (name, email) so
    records remain accurate even if the user account changes.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Sender snapshot (works for both anonymous and authenticated senders)
    sender_name = models.CharField(max_length=200)
    sender_email = models.EmailField()
    sender_phone = models.CharField(max_length=30, blank=True)

    # Optional link to user account when authenticated
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='contact_messages',
    )

    # Message content
    category = models.CharField(
        max_length=20,
        choices=ContactCategory.choices,
        default=ContactCategory.GENERAL,
    )
    subject = models.CharField(max_length=300)
    message = models.TextField()
    preferred_contact = models.CharField(
        max_length=10,
        choices=[('email', 'Email'), ('phone', 'Phone')],
        default='email',
        blank=True,
    )
    consent = models.BooleanField(default=False)

    # Admin workflow
    status = models.CharField(
        max_length=15,
        choices=ContactStatus.choices,
        default=ContactStatus.NEW,
        db_index=True,
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='assigned_contact_messages',
    )
    admin_notes = models.TextField(blank=True)

    # Email delivery tracking
    notification_sent = models.BooleanField(default=False)
    admin_email_sent = models.BooleanField(default=False)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    replied_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['category', '-created_at']),
            models.Index(fields=['sender_email']),
        ]

    def __str__(self):
        return f"[{self.category}] {self.subject} — {self.sender_name} <{self.sender_email}>"


class ContactReply(models.Model):
    """
    An admin reply to a contact message.
    Stored for audit trail; triggers an email to the original sender.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contact_message = models.ForeignKey(
        ContactMessage,
        on_delete=models.CASCADE,
        related_name='replies',
    )
    replied_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='contact_replies',
    )
    reply_text = models.TextField()

    # Email delivery tracking
    email_sent = models.BooleanField(default=False)
    email_sent_at = models.DateTimeField(null=True, blank=True)
    email_error = models.CharField(max_length=500, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Reply to {self.contact_message.subject} by {getattr(self.replied_by, 'email', 'unknown')}"
