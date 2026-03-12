"""Admin configuration for notifications."""

from django.contrib import admin
from django.utils import timezone

from .models import Notification


@admin.action(description='Mark selected notifications as read')
def mark_selected_as_read(modeladmin, request, queryset):
    queryset.filter(is_read=False).update(is_read=True, read_at=timezone.now())


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'user',
        'notification_type',
        'priority',
        'source_module',
        'is_read',
        'created_at',
    )
    list_filter = ('notification_type', 'priority', 'source_module', 'is_read', 'created_at')
    search_fields = ('user__email', 'title', 'message')
    readonly_fields = ('id', 'created_at', 'read_at')
    autocomplete_fields = ('user',)
    actions = (mark_selected_as_read,)
    ordering = ('-created_at',)
