"""Admin registration for giving items."""

from django.contrib import admin
from .models import GivingItem


@admin.register(GivingItem)
class GivingItemAdmin(admin.ModelAdmin):
    """Admin interface for giving items."""
    
    list_display = [
        'title',
        'category',
        'status',
        'visibility',
        'is_featured',
        'display_order',
        'goal_amount_display',
        'raised_amount_display',
        'progress_percentage',
        'created_at',
    ]
    
    list_filter = ['category', 'status', 'visibility', 'is_featured', 'created_at']
    
    search_fields = ['title', 'description', 'verse']
    
    ordering = ['display_order', '-created_at']
    
    readonly_fields = ['id', 'created_at', 'updated_at', 'progress_percentage']
    
    fieldsets = [
        ('Basic Information', {
            'fields': ['title', 'description', 'category', 'icon']
        }),
        ('Visibility & Status', {
            'fields': ['visibility', 'status', 'is_featured']
        }),
        ('Financial Details', {
            'fields': [
                'is_recurring_enabled',
                'suggested_amounts',
                'goal_amount',
                'raised_amount',
                'progress_percentage',
                'deadline',
            ]
        }),
        ('Content', {
            'fields': ['verse', 'cover_image']
        }),
        ('Display & Metrics', {
            'fields': ['display_order', 'total_donations', 'donor_count']
        }),
        ('System', {
            'fields': ['id', 'created_at', 'updated_at'],
            'classes': ['collapse']
        }),
    ]
    
    def goal_amount_display(self, obj):
        """Display goal amount in currency format."""
        if obj.goal_amount:
            return f"₦{obj.goal_amount / 100:,.2f}"
        return "-"
    goal_amount_display.short_description = "Goal"
    
    def raised_amount_display(self, obj):
        """Display raised amount in currency format."""
        return f"₦{obj.raised_amount / 100:,.2f}"
    raised_amount_display.short_description = "Raised"
