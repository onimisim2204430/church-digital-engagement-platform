"""
Series Admin Configuration
"""
from django.contrib import admin
from .models import (
    Series,
    CurrentSeriesSpotlight,
    SeriesSubscription,
    SeriesAnnouncementRequest,
)


@admin.register(Series)
class SeriesAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'visibility', 'is_featured', 'post_count', 'created_at']
    list_filter = ['visibility', 'is_featured', 'created_at']
    search_fields = ['title', 'description', 'author__email']
    readonly_fields = ['id', 'slug', 'total_views', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'title', 'slug', 'description', 'cover_image', 'author')
        }),
        ('Visibility & Features', {
            'fields': ('visibility', 'is_featured', 'featured_priority')
        }),
        ('Analytics', {
            'fields': ('total_views',)
        }),
        ('Soft Delete', {
            'fields': ('is_deleted', 'deleted_at', 'deleted_by'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def post_count(self, obj):
        return obj.get_post_count()
    post_count.short_description = 'Posts'


@admin.register(CurrentSeriesSpotlight)
class CurrentSeriesSpotlightAdmin(admin.ModelAdmin):
    list_display = ['singleton_key', 'series', 'is_active', 'latest_part_label', 'updated_at']
    readonly_fields = ['singleton_key', 'latest_part_label', 'created_at', 'updated_at']
    search_fields = ['series__title', 'latest_part_label', 'cta_label']


@admin.register(SeriesSubscription)
class SeriesSubscriptionAdmin(admin.ModelAdmin):
    list_display = [
        'series', 'subscriber_identity', 'status',
        'verified_at', 'unsubscribed_at', 'created_at',
    ]
    list_filter = ['status', 'created_at']
    search_fields = ['email', 'user__email', 'series__title']
    readonly_fields = [
        'id', 'verification_token_hash', 'verification_token_expires_at',
        'verified_at', 'unsubscribed_at', 'unsubscribe_token', 'created_at', 'updated_at',
    ]

    def subscriber_identity(self, obj):
        if obj.user:
            return f'[user] {obj.user.email}'
        return f'[guest] {obj.email}'
    subscriber_identity.short_description = 'Subscriber'


@admin.register(SeriesAnnouncementRequest)
class SeriesAnnouncementRequestAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'series', 'created_by', 'request_type', 'status',
        'audience_snapshot_count', 'delivered_count', 'failed_count', 'requested_at',
    ]
    list_filter = ['status', 'request_type', 'requested_at']
    search_fields = ['title', 'message', 'series__title', 'created_by__email']
    readonly_fields = [
        'id', 'idempotency_key',
        'requested_at', 'reviewed_at',
        'audience_snapshot_count', 'audience_snapshot_frozen_at',
        'delivery_started_at', 'delivery_completed_at',
        'delivered_count', 'failed_count',
        'created_at', 'updated_at',
    ]
    fieldsets = (
        ('Request', {
            'fields': ('id', 'series', 'created_by', 'request_type', 'related_post', 'title', 'message'),
        }),
        ('Approval', {
            'fields': ('status', 'approved_by', 'admin_note', 'reviewed_at'),
        }),
        ('Delivery', {
            'fields': (
                'audience_snapshot_count', 'audience_snapshot_frozen_at',
                'delivery_started_at', 'delivery_completed_at',
                'delivered_count', 'failed_count',
            ),
        }),
        ('System', {
            'fields': ('idempotency_key', 'requested_at', 'created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
