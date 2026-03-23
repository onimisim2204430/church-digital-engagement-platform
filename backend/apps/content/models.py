"""
Content Management Models
Handles posts, sermons, announcements, and articles
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.text import slugify
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
    SCHEDULED = 'SCHEDULED', 'Scheduled'
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
    
    # Devotional-specific fields
    scripture = models.TextField(
        blank=True,
        null=True,
        help_text="Scripture reference or verse (for devotional content)"
    )
    prayer = models.TextField(
        blank=True,
        null=True,
        help_text="Prayer text (for devotional content)"
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


class EventStatus(models.TextChoices):
    """Publishing status for special one-time church events."""
    DRAFT = 'DRAFT', 'Draft'
    PUBLISHED = 'PUBLISHED', 'Published'


class Event(models.Model):
    """
    Non-recurring special programs and ceremonies.
    Separate from WeeklyEvent, which models recurring weekly schedule entries.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    start_datetime = models.DateTimeField(db_index=True)
    end_datetime = models.DateTimeField(null=True, blank=True)
    location = models.CharField(max_length=255)
    banner_image = models.ImageField(upload_to='events/banners/', null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=EventStatus.choices,
        default=EventStatus.DRAFT,
        db_index=True,
    )
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ['start_datetime', '-created_at']
        indexes = [
            models.Index(fields=['status', 'is_deleted', 'start_datetime']),
        ]

    def __str__(self):
        return f"{self.title} ({self.start_datetime})"

    def clean(self):
        if self.end_datetime and self.end_datetime < self.start_datetime:
            raise ValidationError("End datetime must be greater than or equal to start datetime")

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class ConnectMinistry(models.Model):
    """
    Editable cards for the public/member Connect experience.
    """

    CARD_TYPE_CHOICES = [
        ('group', 'Group'),
        ('serve', 'Serve Team'),
        ('event', 'Event'),
    ]

    STYLE_VARIANT_CHOICES = [
        ('featured_group', 'Featured Group'),
        ('sand_serve', 'Sand Serve Card'),
        ('standard_group', 'Standard Group'),
        ('outlined_serve', 'Outlined Serve Card'),
        ('featured_event', 'Featured Event'),
    ]

    title = models.CharField(max_length=150)
    slug = models.SlugField(max_length=220, unique=True, db_index=True)
    description = models.TextField()
    card_type = models.CharField(max_length=20, choices=CARD_TYPE_CHOICES, default='group')
    style_variant = models.CharField(max_length=30, choices=STYLE_VARIANT_CHOICES, default='standard_group')
    category_label = models.CharField(max_length=80, blank=True)
    schedule_label = models.CharField(max_length=120, blank=True)
    location_label = models.CharField(max_length=120, blank=True)
    date_label = models.CharField(max_length=120, blank=True)
    icon_name = models.CharField(max_length=50, blank=True)
    image_url = models.URLField(max_length=1000, blank=True)
    cta_label = models.CharField(max_length=80, blank=True)
    cta_url = models.URLField(max_length=1000, blank=True)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ['display_order', '-updated_at']
        verbose_name = 'Connect Ministry'
        verbose_name_plural = 'Connect Ministries'
        indexes = [
            models.Index(fields=['is_active', 'display_order']),
            models.Index(fields=['card_type', 'is_active']),
            models.Index(fields=['slug']),
        ]
        constraints = [
            models.UniqueConstraint(fields=['display_order'], name='content_connectministry_unique_display_order'),
        ]

    def clean(self):
        if self.card_type == 'event' and not self.date_label.strip():
            raise ValidationError({'date_label': 'Date label is required for event cards.'})

        if self.card_type in ['group', 'event'] and not self.image_url.strip():
            raise ValidationError({'image_url': 'Image URL is required for group and event cards.'})

        if self.card_type == 'serve' and not self.icon_name.strip():
            raise ValidationError({'icon_name': 'Icon name is required for serve cards.'})

        duplicate = ConnectMinistry.objects.filter(display_order=self.display_order).exclude(pk=self.pk).exists()
        if duplicate:
            raise ValidationError({'display_order': 'Display order must be unique.'})

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)[:200] or 'connect-item'
            candidate = base_slug
            suffix = 2
            while ConnectMinistry.objects.filter(slug=candidate).exclude(pk=self.pk).exists():
                suffix_text = f"-{suffix}"
                candidate = f"{base_slug[:220-len(suffix_text)]}{suffix_text}"
                suffix += 1
            self.slug = candidate

        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class HeroSection(models.Model):
    """
    Dynamic hero section content for the public homepage.
    Stores featured sermon/teaching information with image, title, description, and action buttons.
    
    Contains all hardcoded hero content that should be editable from admin:
    - Title, description, category label
    - Featured image with fallback
    - Two action buttons with icons and URLs
    - Active/inactive toggle for display
    - Display ordering for multiple hero sections
    """
    HERO_TYPES = [
        ('featured_sermon', 'Featured Sermon'),
        ('announcement', 'Announcement'),
        ('event', 'Event'),
    ]
    
    title = models.CharField(
        max_length=200,
        help_text="Main heading (e.g., 'Finding Peace in the Midst of Chaos')"
    )
    description = models.TextField(
        help_text="Subtitle/description text"
    )
    label = models.CharField(
        max_length=100,
        default="Latest Sabbath Teaching",
        help_text="Category label above title (e.g., 'Latest Sabbath Teaching')"
    )
    image = models.ImageField(
        upload_to='hero_images/',
        blank=True,
        null=True,
        help_text="Hero section image"
    )
    image_alt_text = models.CharField(
        max_length=255,
        default="Church content image",
        help_text="Alt text for accessibility"
    )
    
    # Button 1 (Primary action)
    button1_label = models.CharField(
        max_length=100,
        default="Watch Sermon",
        help_text="Text for primary button"
    )
    button1_url = models.URLField(
        blank=True,
        help_text="URL or action for primary button"
    )
    button1_icon = models.CharField(
        max_length=50,
        default="play_circle",
        help_text="Icon name from Icon component"
    )
    
    # Button 2 (Secondary action)
    button2_label = models.CharField(
        max_length=100,
        default="Listen Audio",
        help_text="Text for secondary button"
    )
    button2_url = models.URLField(
        blank=True,
        help_text="URL or action for secondary button"
    )
    button2_icon = models.CharField(
        max_length=50,
        blank=True,
        help_text="Icon name from Icon component"
    )
    
    # Metadata
    hero_type = models.CharField(
        max_length=20,
        choices=HERO_TYPES,
        default='featured_sermon'
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this hero section is currently displayed"
    )
    display_order = models.PositiveIntegerField(
        default=1,
        help_text="Order of display if multiple hero sections"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.CharField(
        max_length=100,
        blank=True,
        help_text="Admin who last updated this hero section"
    )
    
    class Meta:
        ordering = ['-display_order', '-updated_at']
        verbose_name = "Hero Section"
        verbose_name_plural = "Hero Sections"
    
    def __str__(self):
        return f"{self.label} - {self.title}"


class Testimonial(models.Model):
    """
    Community story cards shown in the public Voices section.
    Supports either uploaded video files or external video URLs.
    """

    title = models.CharField(
        max_length=200,
        help_text="Story title (e.g., 'A Journey to Stillness')"
    )
    name = models.CharField(
        max_length=100,
        help_text="Story author label (e.g., James' Story)"
    )
    description = models.TextField(
        blank=True,
        null=True,
        help_text="Optional detailed description"
    )
    video_file = models.FileField(
        upload_to='testimonials/videos/',
        blank=True,
        null=True,
        help_text="Optional uploaded video file (mp4/webm recommended)"
    )
    video_url = models.URLField(
        blank=True,
        help_text="Optional external video URL (YouTube/Vimeo/etc.)"
    )
    thumbnail_image = models.ImageField(
        upload_to='testimonials/thumbnails/',
        help_text="Thumbnail image displayed before playback"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this story appears on the public page"
    )
    display_order = models.PositiveIntegerField(
        default=1,
        help_text="Display order (lower number appears first)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.CharField(
        max_length=100,
        blank=True,
        help_text="Admin who last updated this story"
    )

    class Meta:
        ordering = ['-display_order', '-created_at']
        verbose_name = "Testimonial"
        verbose_name_plural = "Testimonials"
        indexes = [
            models.Index(fields=['is_active', '-display_order']),
        ]

    def clean(self):
        if not self.video_file and not self.video_url:
            raise ValidationError("Provide either a video file or a video URL.")

    def __str__(self):
        return f"{self.name} - {self.title}"


class SpiritualPractice(models.Model):
    """
    Editable spiritual practice cards and detail content.
    Used by homepage carousel and dedicated practices pages.
    """

    ACCENT_COLOR_CHOICES = [
        ('accent-sage', 'Accent Sage'),
        ('primary', 'Primary'),
        ('accent-sand', 'Accent Sand'),
    ]

    ICON_CHOICES = [
        ('self_improvement', 'Self Improvement'),
        ('auto_stories', 'Auto Stories'),
        ('edit_note', 'Edit Note'),
        ('nature', 'Nature'),
        ('menu_book', 'Menu Book'),
        ('headphones', 'Headphones'),
        ('favorite', 'Favorite'),
        ('psychology', 'Psychology'),
    ]

    title = models.CharField(max_length=20)
    slug = models.SlugField(max_length=220, unique=True, db_index=True)
    short_description = models.CharField(
        max_length=80,
        help_text="Short card description shown on homepage."
    )
    duration_label = models.CharField(
        max_length=50,
        default='10 Min',
        help_text="Compact meta label (e.g., 10 Min, 5 Min Read)."
    )
    icon_name = models.CharField(
        max_length=50,
        default='self_improvement',
        choices=ICON_CHOICES,
        help_text="Icon token from the shared Icon mapping."
    )
    accent_color = models.CharField(
        max_length=30,
        default='accent-sage',
        choices=ACCENT_COLOR_CHOICES,
        help_text="Color token used by homepage card styling."
    )
    full_content = models.TextField(
        blank=True,
        help_text="Extended content for the dedicated practice detail page."
    )
    cover_image = models.ImageField(
        upload_to='spiritual_practices/covers/',
        blank=True,
        null=True,
        help_text="Optional cover image for practices page/detail."
    )
    audio_url = models.URLField(
        blank=True,
        help_text="Optional audio guide URL."
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this practice is visible to public endpoints."
    )
    display_order = models.PositiveIntegerField(
        default=1,
        help_text="Display order for homepage carousel and practices pages."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.CharField(
        max_length=100,
        blank=True,
        help_text="Admin who last updated this practice."
    )

    class Meta:
        ordering = ['display_order', '-updated_at']
        verbose_name = "Spiritual Practice"
        verbose_name_plural = "Spiritual Practices"
        indexes = [
            models.Index(fields=['is_active', 'display_order']),
            models.Index(fields=['slug']),
        ]
        constraints = [
            models.UniqueConstraint(fields=['display_order'], name='content_spiritualpractice_unique_display_order'),
        ]

    def clean(self):
        if len((self.title or '').strip()) > 20:
            raise ValidationError({
                'title': "Title must be 20 characters or less."
            })

        if len((self.short_description or '').strip()) > 80:
            raise ValidationError({
                'short_description': "Short description must be 80 characters or less."
            })

        if self.display_order is not None:
            duplicate = SpiritualPractice.objects.filter(display_order=self.display_order).exclude(pk=self.pk).exists()
            if duplicate:
                raise ValidationError({
                    'display_order': "Display order must be unique. Choose another order number."
                })

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)[:200] or 'practice'
            candidate = base_slug
            suffix = 2
            while SpiritualPractice.objects.filter(slug=candidate).exclude(pk=self.pk).exists():
                suffix_text = f"-{suffix}"
                candidate = f"{base_slug[:220-len(suffix_text)]}{suffix_text}"
                suffix += 1
            self.slug = candidate

        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class PrivacyPolicy(models.Model):
    """
    Singleton-style privacy policy content for public display.
    Content is stored in DB and editable from admin interfaces.
    """

    DEFAULT_TITLE = "Privacy Policy"
    DEFAULT_CONTENT = """
<h2>Overview</h2>
<p>This Privacy Policy explains how we collect, use, store, and protect personal information across our church website, member experiences, and digital ministry tools.</p>
<p>By using this platform, you agree to the practices described below.</p>

<h2>Information We Collect</h2>
<p>Depending on how you interact with us, we may collect:</p>
<ul>
    <li><strong>Identity and contact details</strong> such as your name, email address, and phone number.</li>
    <li><strong>Account data</strong> such as login activity, profile information, and communication preferences.</li>
    <li><strong>Engagement data</strong> such as event registrations, prayer submissions, and community interactions.</li>
    <li><strong>Giving data</strong> related to donations and payment references (processed by secure payment providers).</li>
</ul>

<h2>How We Use Your Information</h2>
<p>We use collected data to:</p>
<ul>
    <li>Provide church services and ministry communication.</li>
    <li>Manage user accounts and secure access.</li>
    <li>Coordinate events, discipleship programs, and community support.</li>
    <li>Improve platform reliability, safety, and user experience.</li>
    <li>Comply with legal and financial obligations.</li>
</ul>

<h2>Legal Basis and Consent</h2>
<p>Where required by law, we process data based on consent, legitimate ministry interest, contractual necessity, or legal obligation. You may withdraw consent for optional communications at any time.</p>

<h2>Data Sharing</h2>
<p>We do not sell personal information. We may share limited data with trusted service providers that help us operate core services (for example email delivery, analytics, or payment processing), under appropriate confidentiality and security controls.</p>

<h2>Data Retention</h2>
<p>We retain personal data only as long as reasonably necessary for ministry purposes, account support, reporting requirements, and legal compliance. Data that is no longer needed is removed or anonymized where practical.</p>

<h2>Security</h2>
<p>We apply technical and administrative safeguards to protect personal information from unauthorized access, loss, misuse, or disclosure. No internet-based service is 100% secure, but we continually improve protections.</p>

<h2>Your Rights</h2>
<p>Subject to applicable law, you may have rights to access, correct, delete, or restrict the use of your personal data. You may also request information about data we hold about you.</p>

<h2>Children and Family Data</h2>
<p>Some ministry activities involve minors. We encourage parents and guardians to supervise children's digital participation and contact us for any privacy concerns related to family or youth information.</p>

<h2>Policy Updates</h2>
<p>We may update this Privacy Policy from time to time. The "Last updated" date indicates the latest revision. Continued use of the platform after changes means you accept the updated policy.</p>

<h2>Contact</h2>
<p>If you have questions, requests, or concerns regarding privacy, please contact the church administration team through the official church contact channels.</p>
""".strip()

    title = models.CharField(max_length=255, default=DEFAULT_TITLE)
    content = models.TextField(default=DEFAULT_CONTENT)
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.CharField(
        max_length=100,
        blank=True,
        help_text="Admin who last updated this privacy policy"
    )

    class Meta:
        verbose_name = "Privacy Policy"
        verbose_name_plural = "Privacy Policy"

    def __str__(self):
        return self.title

    @classmethod
    def get_solo(cls):
        policy, _ = cls.objects.get_or_create(
            pk=1,
            defaults={
                'title': cls.DEFAULT_TITLE,
                'content': cls.DEFAULT_CONTENT,
                'is_published': True,
                'updated_by': 'system-seed',
            },
        )
        return policy
