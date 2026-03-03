"""
Content Management Models
Handles posts, sermons, announcements, and articles
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError


class PostContentType(models.Model):
    """
    Dynamic content types for posts (e.g., Sermon, Announcement, Article)
    Replaces hard-coded PostType enum for better flexibility.
    
    System types (is_system=True) cannot be modified or deleted.
    Custom types can be added by admins but must be enabled to appear in dropdowns.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(max_length=50, unique=True, db_index=True, help_text="Immutable identifier (e.g., 'sermon', 'announcement')")
    name = models.CharField(max_length=100, help_text="Display name (e.g., 'Sermon', 'Announcement')")
    description = models.TextField(blank=True, help_text="Optional description for admins")
    
    # System vs Custom
    is_system = models.BooleanField(default=False, help_text="System types cannot be edited or deleted")
    
    # Enable/Disable
    is_enabled = models.BooleanField(default=True, help_text="Only enabled types appear in post creation dropdowns")
    
    # Order
    sort_order = models.IntegerField(default=0, help_text="Display order (lower numbers first)")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['sort_order', 'name']
        verbose_name = "Content Type"
        verbose_name_plural = "Content Types"
        indexes = [
            models.Index(fields=['is_enabled', 'sort_order']),
        ]
    
    def __str__(self):
        return f"{self.name} ({'System' if self.is_system else 'Custom'})"
    
    def clean(self):
        """Validate that system types cannot be modified"""
        if self.pk:  # Existing record
            try:
                original = PostContentType.objects.get(pk=self.pk)
                if original.is_system:
                    # Check if protected fields changed
                    if original.slug != self.slug:
                        raise ValidationError("Cannot modify slug of system content type")
                    if original.name != self.name:
                        raise ValidationError("Cannot modify name of system content type")
                    if original.is_system != self.is_system:
                        raise ValidationError("Cannot change is_system flag")
            except PostContentType.DoesNotExist:
                pass
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        """Prevent deletion of system types or types with existing posts"""
        if self.is_system:
            raise ValidationError("Cannot delete system content type")
        
        # Check if any posts use this type
        if self.posts.exists():
            raise ValidationError(f"Cannot delete content type '{self.name}' because it is used by {self.posts.count()} post(s)")
        
        super().delete(*args, **kwargs)


# Legacy enum - kept for backward compatibility during migration
class PostType(models.TextChoices):
    """Types of content posts"""
    SERMON = 'SERMON', 'Sermon'
    ANNOUNCEMENT = 'ANNOUNCEMENT', 'Announcement'
    ARTICLE = 'ARTICLE', 'Article'
    DEVOTIONAL = 'DEVOTIONAL', 'Devotional'


class PostStatus(models.TextChoices):
    """Post publishing status"""
    DRAFT = 'DRAFT', 'Draft'
    PUBLISHED = 'PUBLISHED', 'Published'


class Post(models.Model):
    """
    Main content model for sermons, announcements, articles, etc.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    content = models.TextField()
    
    # New: Foreign key to dynamic content type (preferred)
    content_type = models.ForeignKey(
        PostContentType,
        on_delete=models.PROTECT,  # Prevent deletion of types with posts
        related_name='posts',
        null=True,  # Allow null during migration
        blank=True,
        help_text="Dynamic content type (Sermon, Announcement, etc.)"
    )
    
    # Legacy: CharField with TextChoices (kept for backward compatibility)
    post_type = models.CharField(
        max_length=20,
        choices=PostType.choices,
        default=PostType.ARTICLE,
        help_text="[DEPRECATED] Use content_type instead"
    )
    
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='posts'
    )
    
    # Series relationship
    series = models.ForeignKey(
        'series.Series',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='posts',
        help_text="Series this post belongs to (optional)"
    )
    
    series_order = models.IntegerField(
        default=0,
        help_text="Order/part number within the series (e.g., Part 1, Part 2)"
    )
    
    # Category/Topic classification
    category = models.CharField(
        max_length=50,
        blank=True,
        default='Faith',
        help_text="Content category/topic (e.g., Mental Health, Prayer, Marriage)"
    )
    
    # Scheduling (for daily words and time-based content)
    scheduled_date = models.DateField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Date when this content is scheduled to appear (for daily words, etc.)"
    )
    
    # Publishing
    is_published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=PostStatus.choices,
        default=PostStatus.DRAFT,
        help_text="Publishing status: DRAFT or PUBLISHED"
    )
    
    # Featured content (for homepage editorial control)
    is_featured = models.BooleanField(default=False)
    featured_priority = models.IntegerField(default=0, help_text="Higher numbers appear first in featured section")
    
    # Interaction settings
    comments_enabled = models.BooleanField(default=True)
    reactions_enabled = models.BooleanField(default=True)
    
    # Media - using TextField to support both URLs and base64 data URLs
    featured_image = models.TextField(blank=True, null=True)
    video_url = models.URLField(max_length=500, blank=True, null=True)
    audio_url = models.URLField(max_length=500, blank=True, null=True)
    
    # Metadata
    views_count = models.IntegerField(default=0)
    is_deleted = models.BooleanField(default=False)  # Soft delete
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deleted_posts'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['post_type', '-created_at']),
            models.Index(fields=['is_published', '-published_at']),
            models.Index(fields=['is_featured', '-featured_priority']),
            models.Index(fields=['series', 'series_order']),
            # Indexes for daily word / scheduled content
            models.Index(fields=['scheduled_date']),
            models.Index(fields=['scheduled_date', 'status']),
            models.Index(fields=['scheduled_date', 'is_deleted']),
        ]
    
    def __str__(self):
        return f"{self.get_post_type_display()}: {self.title}"
    
    def get_content_type_name(self):
        """
        Get the content type name, preferring the new content_type FK over legacy post_type.
        Ensures backward compatibility during migration.
        """
        if self.content_type:
            return self.content_type.name
        return self.get_post_type_display()
    
    def get_content_type_slug(self):
        """
        Get the content type slug, preferring the new content_type FK over legacy post_type.
        """
        if self.content_type:
            return self.content_type.slug
        return self.post_type.lower()
    
    def clean(self):
        """
        Validate the post before saving.
        Enforce one post per scheduled_date for devotional/daily word content.
        """
        super().clean()
        
        # Only check uniqueness for posts with a scheduled_date (daily words, etc.)
        if self.scheduled_date and self.content_type and self.content_type.slug == 'devotional':
            # Check if another post exists for this date
            existing = Post.objects.filter(
                scheduled_date=self.scheduled_date,
                content_type__slug='devotional',
                is_deleted=False
            ).exclude(pk=self.pk)  # Exclude self when updating
            
            if existing.exists():
                existing_post = existing.first()
                raise ValidationError({
                    'scheduled_date': f'A devotional post already exists for {self.scheduled_date}: "{existing_post.title}" by {existing_post.author.get_full_name() or existing_post.author.username}. Please replace, reschedule, or cancel.'
                })
    
    def publish(self):
        """
        Publish the post immediately
        - First publish: Sets published_at (immutable after this)
        - Re-publish: Only updates updated_at, preserves published_at
        """
        now = timezone.now()
        self.is_published = True
        self.status = PostStatus.PUBLISHED
        
        # Only set published_at if this is the FIRST publish
        if self.published_at is None:
            self.published_at = now
        
        # Always update the timestamp when publishing
        self.updated_at = now
        self.save(update_fields=['is_published', 'status', 'published_at', 'updated_at'])
    
    def unpublish(self):
        """
        Unpublish the post (revert to draft)
        Note: Preserves published_at to maintain audit trail
        """
        self.is_published = False
        self.status = PostStatus.DRAFT
        # Keep published_at for audit trail - don't reset to None
        self.save(update_fields=['is_published', 'status'])
    
    def soft_delete(self, user):
        """Soft delete the post"""
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.deleted_by = user
        self.is_published = False
        self.save()


class InteractionType(models.TextChoices):
    """Types of member interactions"""
    COMMENT = 'COMMENT', 'Comment'
    QUESTION = 'QUESTION', 'Question'
    FLAGGED = 'FLAGGED', 'Flagged Comment'


class InteractionStatus(models.TextChoices):
    """Status tracking for interactions"""
    OPEN = 'OPEN', 'Open'
    ANSWERED = 'ANSWERED', 'Answered'
    CLOSED = 'CLOSED', 'Closed'
    PENDING = 'PENDING', 'Pending Review'
    REVIEWED = 'REVIEWED', 'Reviewed'
    ACTIONED = 'ACTIONED', 'Actioned'


class Interaction(models.Model):
    """
    Member interactions on posts - comments, questions, and flags.
    
    - Comments: Regular feedback/discussion
    - Questions: Comments marked as questions (requires response)
    - Flagged: Comments reported as inappropriate
    
    Access Control:
    - Admin: Full access to all interactions
    - Moderator: Can view all, respond only to questions on their own posts
    - Member: Can create interactions, view their own
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relationships
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='interactions')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='interactions')
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='replies')
    
    # Content
    content = models.TextField(help_text="Comment or question text")
    
    # Classification
    type = models.CharField(
        max_length=20,
        choices=InteractionType.choices,
        default=InteractionType.COMMENT,
        db_index=True
    )
    is_question = models.BooleanField(default=False, help_text="Is this a question requiring response?")
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=InteractionStatus.choices,
        default=InteractionStatus.OPEN,
        db_index=True
    )
    
    # Flagging
    is_flagged = models.BooleanField(default=False, db_index=True, help_text="Has been flagged as inappropriate")
    flagged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='flagged_interactions'
    )
    flagged_at = models.DateTimeField(null=True, blank=True)
    flag_reason = models.TextField(blank=True, help_text="Reason for flagging")
    
    # Response tracking
    responded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='responded_interactions'
    )
    responded_at = models.DateTimeField(null=True, blank=True)
    
    # Visibility
    is_hidden = models.BooleanField(default=False, help_text="Hidden from public view")
    is_deleted = models.BooleanField(default=False, help_text="Soft delete")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Interaction"
        verbose_name_plural = "Interactions"
        indexes = [
            models.Index(fields=['post', 'is_deleted']),
            models.Index(fields=['user', 'is_deleted']),
            models.Index(fields=['type', 'status']),
            models.Index(fields=['is_question', 'status']),
            models.Index(fields=['is_flagged', 'status']),
        ]
    
    def __str__(self):
        return f"{self.get_type_display()} by {self.user.email} on {self.post.title}"
    
    def flag(self, user, reason=""):
        """Flag this interaction as inappropriate"""
        self.is_flagged = True
        self.flagged_by = user
        self.flagged_at = timezone.now()
        self.flag_reason = reason
        self.status = InteractionStatus.PENDING
        self.save(update_fields=['is_flagged', 'flagged_by', 'flagged_at', 'flag_reason', 'status', 'updated_at'])
    
    def mark_answered(self, responder):
        """Mark question as answered"""
        if self.is_question:
            self.status = InteractionStatus.ANSWERED
            self.responded_by = responder
            self.responded_at = timezone.now()
            self.save(update_fields=['status', 'responded_by', 'responded_at', 'updated_at'])
    
    def close(self):
        """Close the interaction"""
        self.status = InteractionStatus.CLOSED
        self.save(update_fields=['status', 'updated_at'])
    
    def hide(self):
        """Hide from public view"""
        self.is_hidden = True
        self.save(update_fields=['is_hidden', 'updated_at'])
    
    def soft_delete(self):
        """Soft delete the interaction"""
        self.is_deleted = True
        self.save(update_fields=['is_deleted', 'updated_at'])


class Draft(models.Model):
    """
    Auto-save drafts for post creation/editing
    Prevents data loss from browser crashes, network issues, or accidental navigation
    
    Features:
    - Auto-saves every 30 seconds and on typing pause
    - Multiple drafts per user (different posts)
    - Drafts can be linked to existing posts (editing) or standalone (new posts)
    - Auto-cleanup after configurable retention period
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Ownership
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='drafts',
        help_text="User who owns this draft"
    )
    
    # Post relationship (null if creating new post, not null if editing existing)
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='drafts',
        help_text="Linked post if editing existing content"
    )
    
    # Draft metadata
    draft_title = models.CharField(
        max_length=255,
        blank=True,
        help_text="Working title for identification"
    )
    
    # Draft content (JSON field storing the full form state)
    draft_data = models.JSONField(
        help_text="Complete form state including title, content, settings, etc."
    )
    
    # Content type
    content_type = models.ForeignKey(
        PostContentType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='drafts',
        help_text="Content type of this draft"
    )
    
    # Version tracking
    version = models.IntegerField(
        default=1,
        help_text="Auto-increment on each save for future version history"
    )
    
    # Status flags
    is_published_draft = models.BooleanField(
        default=False,
        help_text="Whether this draft is for content that was previously published"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    last_autosave_at = models.DateTimeField(auto_now=True, db_index=True)
    
    class Meta:
        ordering = ['-last_autosave_at']
        verbose_name = "Draft"
        verbose_name_plural = "Drafts"
        indexes = [
            models.Index(fields=['user', '-last_autosave_at']),
            models.Index(fields=['post', 'user']),
            models.Index(fields=['-last_autosave_at']),
        ]
        # Ensure only one draft per user per post (when editing existing post)
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'post'],
                condition=models.Q(post__isnull=False),
                name='unique_user_post_draft'
            )
        ]
    
    def __str__(self):
        if self.post:
            return f"Draft for '{self.post.title}' by {self.user.email}"
        return f"New draft '{self.draft_title}' by {self.user.email}"
    
    def save(self, *args, **kwargs):
        """Auto-increment version on each save"""
        if self.pk:
            # Existing draft - increment version
            self.version += 1
        else:
            # New draft - extract title from draft_data for identification
            if isinstance(self.draft_data, dict) and 'title' in self.draft_data:
                self.draft_title = self.draft_data['title'][:255]
        
        super().save(*args, **kwargs)
    
    def get_preview(self, max_length=100):
        """Get content preview for display in draft list"""
        if isinstance(self.draft_data, dict):
            content = self.draft_data.get('content', '')
            # Strip HTML tags for preview
            import re
            text = re.sub('<[^<]+?>', '', content)
            if len(text) > max_length:
                return text[:max_length] + '...'
            return text
        return ""


class WeeklyEvent(models.Model):
    """
    Represents a recurring weekly event (e.g., Sunday Service, Monday Prayer, etc.)
    Displayed in the Weekly Flow section on the public homepage.
    Can optionally link to a daily word or other post for that day.
    """
    
    DAY_CHOICES = [
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    day_of_week = models.IntegerField(
        choices=DAY_CHOICES,
        unique=True,
        db_index=True,
        help_text="Day of week (0=Monday, 6=Sunday)"
    )
    title = models.CharField(
        max_length=100,
        help_text="Event name (e.g., 'Morning Prayer', 'Study Circle')"
    )
    time = models.CharField(
        max_length=50,
        help_text="Event time (e.g., '8:00 AM', 'Sunset')"
    )
    description = models.TextField(
        blank=True,
        help_text="Optional description of the event"
    )
    
    # Optional link to a daily word or other related post
    linked_post = models.ForeignKey(
        Post,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='weekly_events',
        help_text="Optional: Daily word or other post for this day"
    )
    
    # Display ordering
    sort_order = models.SmallIntegerField(
        default=0,
        help_text="Display order (lower numbers appear first)"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['day_of_week', 'sort_order']
        verbose_name = "Weekly Event"
        verbose_name_plural = "Weekly Events"
        indexes = [
            models.Index(fields=['day_of_week']),
        ]
    
    def __str__(self):
        return f"{self.get_day_of_week_display()} - {self.title} ({self.time})"
    
    def get_day_name(self):
        """Get the full day name"""
        return self.get_day_of_week_display()
