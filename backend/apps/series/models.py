"""
Series Models
Manages content series and collections for organizing related posts
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError


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
