from django.contrib import admin
from .models import PageView, AnalyticsSnapshot


@admin.register(PageView)
class PageViewAdmin(admin.ModelAdmin):
    list_display = ['page', 'ip_address', 'user', 'timestamp']
    list_filter = ['page', 'timestamp']
    search_fields = ['ip_address', 'device_fingerprint']
    readonly_fields = ['device_fingerprint', 'timestamp']


@admin.register(AnalyticsSnapshot)
class AnalyticsSnapshotAdmin(admin.ModelAdmin):
    list_display = ['date', 'total_page_views', 'unique_visitors']
    list_filter = ['date']
    readonly_fields = ['date']
