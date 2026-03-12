"""
Moderation and Audit Log Models
Tracks admin actions and system events
"""
import uuid
from django.db import models
from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType


class ActionType(models.TextChoices):
    """Types of admin actions"""
    CREATE = 'CREATE', 'Create'
    UPDATE = 'UPDATE', 'Update'
    DELETE = 'DELETE', 'Delete'
    PUBLISH = 'PUBLISH', 'Publish'
    UNPUBLISH = 'UNPUBLISH', 'Unpublish'
    SUSPEND = 'SUSPEND', 'Suspend User'
    REACTIVATE = 'REACTIVATE', 'Reactivate User'
    ROLE_CHANGE = 'ROLE_CHANGE', 'Role Change'
    EMAIL_SENT = 'EMAIL_SENT', 'Email Campaign Sent'
    COMMENT_DELETE = 'COMMENT_DELETE', 'Comment Deleted'
    QUESTION_ANSWER = 'QUESTION_ANSWER', 'Question Answered'


class AuditLog(models.Model):
    """
    Audit log for tracking all admin actions
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Who performed the action
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs'
    )
    
    # What action was performed
    action_type = models.CharField(
        max_length=20,
        choices=ActionType.choices
    )
    description = models.TextField()
    
    # Generic foreign key to track any model
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    object_id = models.CharField(max_length=255, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Additional metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    # Timestamp
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['action_type', '-created_at']),
            models.Index(fields=['content_type', 'object_id']),
        ]
    
    def __str__(self):
        return f"{self.user.email if self.user else 'System'} - {self.get_action_type_display()} - {self.created_at}"


class Report(models.Model):
    """
    User reports for inappropriate content
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Who reported
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reports_made'
    )
    
    # What was reported (generic)
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE
    )
    object_id = models.CharField(max_length=255)
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Report details
    reason = models.TextField()
    
    # Status
    is_resolved = models.BooleanField(default=False)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reports_resolved'
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['is_resolved', '-created_at']),
            models.Index(fields=['reporter', '-created_at']),
        ]
    
    def __str__(self):
        return f"Report by {self.reporter.email} - {'Resolved' if self.is_resolved else 'Pending'}"
