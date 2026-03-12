"""
Interaction Models
Handles comments, reactions, and questions on posts
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class ReactionType(models.TextChoices):
    """Types of reactions - church-appropriate emoji-based affirmations"""
    LIKE = 'LIKE', 'Like (👍)'
    AMEN = 'AMEN', 'Amen (🙏)'
    LOVE = 'LOVE', 'Love (❤️)'
    INSIGHT = 'INSIGHT', 'Insight (💡)'
    PRAISE = 'PRAISE', 'Praise (🎉)'


class Comment(models.Model):
    """
    User comments on posts
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(
        'content.Post',
        on_delete=models.CASCADE,
        related_name='comments'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    content = models.TextField()
    
    # Parent comment for replies
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='replies'
    )
    
    # Question tracking
    is_question = models.BooleanField(default=False, help_text="Is this a question requiring moderator response?")
    question_status = models.CharField(
        max_length=20,
        choices=[
            ('OPEN', 'Open'),
            ('ANSWERED', 'Answered'),
            ('CLOSED', 'Closed')
        ],
        default='OPEN',
        help_text="Status of question"
    )
    answered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='answered_comment_questions',
        help_text="Who answered the question"
    )
    answered_at = models.DateTimeField(null=True, blank=True)
    
    # Moderation
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deleted_comments'
    )
    is_flagged = models.BooleanField(default=False)
    flagged_reason = models.CharField(max_length=255, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['post', '-created_at']),
            models.Index(fields=['user', '-created_at']),
        ]
    
    def __str__(self):
        return f"Comment by {self.user.email} on {self.post.title}"
    
    def soft_delete(self, user):
        """Soft delete the comment"""
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.deleted_by = user
        self.save()


class Reaction(models.Model):
    """
    User reactions on posts (Like, Love, Pray, Amen)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(
        'content.Post',
        on_delete=models.CASCADE,
        related_name='reactions'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reactions'
    )
    reaction_type = models.CharField(
        max_length=10,
        choices=ReactionType.choices,
        default=ReactionType.LIKE
    )
    emoji = models.CharField(
        max_length=10,
        default='👍',
        help_text="Emoji representation of reaction"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['post', 'user']  # One reaction per user per post
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['post', 'reaction_type']),
            models.Index(fields=['user', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.get_reaction_type_display()} on {self.post.title}"


class Question(models.Model):
    """
    Member questions that need admin response
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(
        'content.Post',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='questions'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='questions'
    )
    subject = models.CharField(max_length=255)
    question_text = models.TextField()
    
    # Admin response
    answer_text = models.TextField(blank=True)
    answered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='answered_questions'
    )
    answered_at = models.DateTimeField(null=True, blank=True)
    
    # Status
    is_closed = models.BooleanField(default=False)
    is_public = models.BooleanField(default=False)  # Show answer publicly
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['is_closed', '-created_at']),
            models.Index(fields=['user', '-created_at']),
        ]
    
    def __str__(self):
        return f"Question from {self.user.email}: {self.subject}"
    
    def answer(self, admin_user, answer_text):
        """Admin answers the question"""
        self.answer_text = answer_text
        self.answered_by = admin_user
        self.answered_at = timezone.now()
        self.save()
    
    def close(self):
        """Close the question"""
        self.is_closed = True
        self.save()
