"""Database models for giving/seed catalog items."""

import uuid
from django.db import models
from django.core.validators import MinValueValidator


class GivingCategory(models.TextChoices):
    """Giving item categories."""
    TITHE = 'tithe', 'Tithes'
    OFFERING = 'offering', 'Offerings'
    PROJECT = 'project', 'Projects'
    MISSION = 'mission', 'Missions'
    SEED = 'seed', 'Seed'
    OTHER = 'other', 'Other'


class GivingVisibility(models.TextChoices):
    """Who can see this giving item."""
    PUBLIC = 'public', 'Public'
    MEMBERS_ONLY = 'members_only', 'Members Only'
    HIDDEN = 'hidden', 'Hidden'


class GivingStatus(models.TextChoices):
    """Current status of the giving item."""
    ACTIVE = 'active', 'Active'
    ARCHIVED = 'archived', 'Archived'
    PAUSED = 'paused', 'Paused'
    COMPLETED = 'completed', 'Completed'
    DRAFT = 'draft', 'Draft'


class GivingItem(models.Model):
    """Catalog of giving/seed items displayed on public giving page."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Core fields
    category = models.CharField(
        max_length=20,
        choices=GivingCategory.choices,
        default=GivingCategory.OFFERING,
        db_index=True
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    icon = models.CharField(max_length=50, default='volunteer_activism')
    
    # Visibility & status
    visibility = models.CharField(
        max_length=20,
        choices=GivingVisibility.choices,
        default=GivingVisibility.PUBLIC,
        db_index=True
    )
    status = models.CharField(
        max_length=20,
        choices=GivingStatus.choices,
        default=GivingStatus.DRAFT,
        db_index=True
    )
    
    # Features
    is_featured = models.BooleanField(default=False, db_index=True)
    is_recurring_enabled = models.BooleanField(default=False)
    
    # Financial configuration
    suggested_amounts = models.JSONField(
        default=list,
        blank=True,
        help_text='List of suggested donation amounts'
    )
    goal_amount = models.PositiveBigIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)],
        help_text='Fundraising goal in smallest currency unit (kobo/cent)'
    )
    raised_amount = models.PositiveBigIntegerField(
        default=0,
        help_text='Total raised so far in smallest currency unit'
    )
    deadline = models.DateField(
        null=True,
        blank=True,
        help_text='Campaign deadline (optional)'
    )
    
    # Content
    verse = models.TextField(blank=True)
    cover_image = models.URLField(max_length=500, blank=True)
    
    # Ordering
    display_order = models.PositiveIntegerField(
        default=0,
        db_index=True,
        help_text='Lower numbers appear first'
    )
    
    # Metrics (computed/aggregated from PaymentTransaction)
    total_donations = models.PositiveBigIntegerField(
        default=0,
        help_text='Cached total donations count'
    )
    donor_count = models.PositiveIntegerField(
        default=0,
        help_text='Cached unique donor count'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'giving_items'
        ordering = ['display_order', '-created_at']
        indexes = [
            models.Index(fields=['status', 'visibility']),
            models.Index(fields=['category', 'status']),
        ]
    
    def __str__(self):
        return f'{self.category}: {self.title}'
    
    @property
    def progress_percentage(self):
        """Calculate fundraising progress."""
        if not self.goal_amount or self.goal_amount == 0:
            return None
        return min(100, int((self.raised_amount / self.goal_amount) * 100))
