"""
Series Models
Manages content series and collections for organizing related posts
"""
import uuid
import hashlib
import secrets
from datetime import timedelta
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db.models import Q


class SeriesVisibility(models.TextChoices):
    """Series visibility options"""
    PUBLIC = 'PUBLIC', 'Public'
    MEMBERS_ONLY = 'MEMBERS_ONLY', 'Members Only'
    HIDDEN = 'HIDDEN', 'Hidden'


class Series(models.Model):
    """
    Series model for grouping related content items.
    
    A series is a collection that can contain multiple posts of any content type.
    Posts maintain their original content type within the series.
    
    Permissions:
    - ADMIN: Can create, edit, delete any series
    - MODERATOR: Can create series, edit/delete only their own
    
    Visibility:
    - PUBLIC: Visible to all visitors
    - MEMBERS_ONLY: Visible only to logged-in members
    - HIDDEN: Only visible to admins/moderators
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text='Unique identifier for the series'
    )
    
    title = models.CharField(
        max_length=255,
        help_text='Series title'
    )
    
    slug = models.SlugField(
        max_length=255,
        unique=True,
        blank=True,
        help_text='URL-friendly identifier (auto-generated from title)'
    )
    
    description = models.TextField(
        blank=True,
        help_text='Series description or overview'
    )
    
    cover_image = models.TextField(
        blank=True,
        null=True,
        help_text='Cover image URL or base64 data'
    )
    
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_series',
        help_text='Series creator'
    )
    
    visibility = models.CharField(
        max_length=20,
        choices=SeriesVisibility.choices,
        default=SeriesVisibility.PUBLIC,
        help_text='Who can see this series'
    )
    
    is_featured = models.BooleanField(
        default=False,
        help_text='Display on homepage as featured series'
    )
    
    featured_priority = models.IntegerField(
        default=0,
        help_text='Display order for featured series (higher = first)'
    )
    
    # Analytics
    total_views = models.IntegerField(
        default=0,
        help_text='Total views across all posts in series'
    )
    
    # Soft delete
    is_deleted = models.BooleanField(
        default=False,
        help_text='Soft delete flag'
    )
    
    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the series was deleted'
    )
    
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deleted_series',
        help_text='Who deleted this series'
    )
    
    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text='When the series was created'
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text='Last update time'
    )
    
    class Meta:
        verbose_name = 'Series'
        verbose_name_plural = 'Series'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['author', '-created_at']),
            models.Index(fields=['is_featured', '-featured_priority']),
            models.Index(fields=['visibility', '-created_at']),
            models.Index(fields=['is_deleted']),
        ]
    
    def __str__(self):
        return self.title
    
    def save(self, *args, **kwargs):
        """Auto-generate slug from title if not provided"""
        if not self.slug:
            from django.utils.text import slugify
            base_slug = slugify(self.title)
            slug = base_slug
            counter = 1
            
            # Ensure unique slug
            while Series.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            
            self.slug = slug
        
        super().save(*args, **kwargs)
    
    def soft_delete(self, user):
        """Soft delete the series"""
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.deleted_by = user
        self.save()
    
    def get_post_count(self):
        """Get number of posts in this series"""
        return self.posts.filter(is_deleted=False).count()
    
    def get_published_post_count(self):
        """Get number of published posts in this series"""
        return self.posts.filter(is_deleted=False, is_published=True).count()
    
    def get_date_range(self):
        """Get date range of posts in series (first to last published)"""
        published_posts = self.posts.filter(
            is_deleted=False,
            is_published=True
        ).order_by('published_at')
        
        if not published_posts.exists():
            return None
        
        first_post = published_posts.first()
        last_post = published_posts.last()
        
        return {
            'start': first_post.published_at,
            'end': last_post.published_at
        }
    
    def get_next_part_number(self):
        """Get the next available part number for this series"""
        max_part = self.posts.aggregate(
            models.Max('series_order')
        )['series_order__max']
        
        return (max_part or 0) + 1
    
    def update_total_views(self):
        """Update total views from all posts in series"""
        total = self.posts.filter(is_deleted=False).aggregate(
            models.Sum('views_count')
        )['views_count__sum']
        
        self.total_views = total or 0
        self.save(update_fields=['total_views'])


class CurrentSeriesSpotlight(models.Model):
    """Singleton-style config for the public Current Series section."""

    class LatestPartStatus(models.TextChoices):
        AVAILABLE = 'AVAILABLE', 'Available'
        COMING_SOON = 'COMING_SOON', 'Coming Soon'

    singleton_key = models.CharField(
        max_length=32,
        unique=True,
        default='default',
        editable=False,
        help_text='Enforces a single spotlight configuration row',
    )

    series = models.ForeignKey(
        Series,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='current_spotlight_entries',
        help_text='Series selected for the Current Series section',
    )

    section_label = models.CharField(
        max_length=80,
        default='Current Series',
        help_text='Section tag text shown above the title',
    )

    latest_part_number = models.PositiveIntegerField(
        default=4,
        help_text='Manual part number shown on artwork badge',
    )

    latest_part_status = models.CharField(
        max_length=20,
        choices=LatestPartStatus.choices,
        default=LatestPartStatus.AVAILABLE,
        help_text='Manual latest part status shown on artwork badge',
    )

    latest_part_label = models.CharField(
        max_length=120,
        default='Part 4 Available',
        help_text='Generated label shown on the artwork badge',
    )

    description_override = models.TextField(
        blank=True,
        help_text='Optional custom description for public section',
    )

    cta_label = models.CharField(
        max_length=80,
        default='View Series Collection',
        help_text='CTA text shown on the left column',
    )

    is_active = models.BooleanField(
        default=True,
        help_text='Whether this spotlight config is active on public pages',
    )

    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_current_series_spotlights',
        help_text='Admin/moderator who last updated this spotlight config',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Current Series Spotlight'
        verbose_name_plural = 'Current Series Spotlight'

    def __str__(self):
        if self.series:
            return f'Current Spotlight: {self.series.title}'
        return 'Current Spotlight: Not configured'

    def save(self, *args, **kwargs):
        if not self.singleton_key:
            self.singleton_key = 'default'

        if self.latest_part_number is None or self.latest_part_number < 1:
            self.latest_part_number = 1

        status_label = dict(self.LatestPartStatus.choices).get(
            self.latest_part_status,
            self.LatestPartStatus.AVAILABLE,
        )
        self.latest_part_label = f'Part {self.latest_part_number} {status_label}'

        super().save(*args, **kwargs)


class SeriesSubscriptionStatus(models.TextChoices):
    PENDING_VERIFICATION = 'PENDING_VERIFICATION', 'Pending Verification'
    ACTIVE = 'ACTIVE', 'Active'
    UNSUBSCRIBED = 'UNSUBSCRIBED', 'Unsubscribed'


class SeriesSubscription(models.Model):
    """Subscription to series updates for authenticated and public users."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    series = models.ForeignKey(
        Series,
        on_delete=models.CASCADE,
        related_name='subscriptions',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='series_subscriptions',
    )
    email = models.EmailField(blank=True)
    status = models.CharField(
        max_length=30,
        choices=SeriesSubscriptionStatus.choices,
        default=SeriesSubscriptionStatus.PENDING_VERIFICATION,
    )
    verification_token_hash = models.CharField(max_length=64, blank=True, db_index=True)
    verification_token_expires_at = models.DateTimeField(null=True, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    unsubscribed_at = models.DateTimeField(null=True, blank=True)
    unsubscribe_token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['series', 'user'],
                condition=Q(user__isnull=False),
                name='uniq_series_subscription_user',
            ),
            models.UniqueConstraint(
                fields=['series', 'email'],
                condition=Q(user__isnull=True) & ~Q(email=''),
                name='uniq_series_subscription_public_email',
            ),
        ]
        indexes = [
            models.Index(fields=['series', 'status']),
            models.Index(fields=['email', 'status']),
            models.Index(fields=['user', 'status']),
        ]

    def __str__(self):
        identity = self.user_id or self.email
        return f'{self.series.title} :: {identity} :: {self.status}'

    def clean(self):
        super().clean()
        if not self.user and not self.email:
            raise ValidationError('Either user or email must be provided for a subscription.')
        if self.email:
            self.email = self.email.strip().lower()

    @staticmethod
    def _hash_token(raw_token: str) -> str:
        return hashlib.sha256(raw_token.encode('utf-8')).hexdigest()

    def create_verification_token(self, ttl_minutes: int = 30) -> str:
        raw_token = secrets.token_urlsafe(32)
        self.verification_token_hash = self._hash_token(raw_token)
        self.verification_token_expires_at = timezone.now() + timedelta(minutes=ttl_minutes)
        self.save(update_fields=['verification_token_hash', 'verification_token_expires_at', 'updated_at'])
        return raw_token

    def mark_active(self):
        now = timezone.now()
        self.status = SeriesSubscriptionStatus.ACTIVE
        self.verified_at = now
        self.verification_token_hash = ''
        self.verification_token_expires_at = None
        self.unsubscribed_at = None
        self.save(
            update_fields=[
                'status',
                'verified_at',
                'verification_token_hash',
                'verification_token_expires_at',
                'unsubscribed_at',
                'updated_at',
            ]
        )

    def mark_unsubscribed(self):
        self.status = SeriesSubscriptionStatus.UNSUBSCRIBED
        self.unsubscribed_at = timezone.now()
        self.save(update_fields=['status', 'unsubscribed_at', 'updated_at'])

    def matches_verification_token(self, raw_token: str) -> bool:
        if not self.verification_token_hash or not self.verification_token_expires_at:
            return False
        if timezone.now() > self.verification_token_expires_at:
            return False
        return self.verification_token_hash == self._hash_token(raw_token)


class SeriesAnnouncementRequestType(models.TextChoices):
    ANNOUNCEMENT = 'ANNOUNCEMENT', 'Announcement'
    NEW_ARTICLE = 'NEW_ARTICLE', 'New Article Update'


class SeriesAnnouncementRequestStatus(models.TextChoices):
    PENDING_ADMIN_APPROVAL = 'PENDING_ADMIN_APPROVAL', 'Pending Admin Approval'
    APPROVED = 'APPROVED', 'Approved'
    REJECTED = 'REJECTED', 'Rejected'
    PROCESSING = 'PROCESSING', 'Processing'
    DELIVERED = 'DELIVERED', 'Delivered'
    FAILED = 'FAILED', 'Failed'


class SeriesAnnouncementRequest(models.Model):
    """Moderator-submitted send requests that require admin approval before delivery."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    series = models.ForeignKey(
        Series,
        on_delete=models.CASCADE,
        related_name='announcement_requests',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_series_announcement_requests',
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_series_announcement_requests',
    )
    related_post = models.ForeignKey(
        'content.Post',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='series_announcement_requests',
    )
    request_type = models.CharField(
        max_length=24,
        choices=SeriesAnnouncementRequestType.choices,
        default=SeriesAnnouncementRequestType.ANNOUNCEMENT,
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    status = models.CharField(
        max_length=32,
        choices=SeriesAnnouncementRequestStatus.choices,
        default=SeriesAnnouncementRequestStatus.PENDING_ADMIN_APPROVAL,
        db_index=True,
    )
    admin_note = models.TextField(blank=True)
    requested_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    audience_snapshot_count = models.IntegerField(
        default=0,
        help_text='Number of active subscribers frozen at admin-approval time.',
    )
    audience_snapshot_frozen_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the subscriber audience was frozen for delivery.',
    )
    delivery_started_at = models.DateTimeField(null=True, blank=True)
    delivery_completed_at = models.DateTimeField(null=True, blank=True)
    delivered_count = models.IntegerField(default=0)
    failed_count = models.IntegerField(default=0)
    idempotency_key = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['series', 'status', '-created_at']),
            models.Index(fields=['created_by', 'status', '-created_at']),
        ]

    def __str__(self):
        return f'{self.series.title} :: {self.request_type} :: {self.status}'
