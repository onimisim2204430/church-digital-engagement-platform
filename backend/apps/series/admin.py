"""
Series Admin Configuration
"""
from django.contrib import admin
from .models import Series, CurrentSeriesSpotlight


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
