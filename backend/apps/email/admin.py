"""
Django admin configuration for the standalone email service.

Highlights:
- EmailTemplate: preview button, version history, inline test-send form
- EmailMessage:  read-only audit view with re-send action
- EmailProviderConfig: status dashboard with circuit breaker indicator
- EmailUnsubscribe / EmailConsentLog: GDPR audit tools
"""

from django.contrib import admin
from django.http import HttpResponse
from django.urls import path
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from .models import (
    EmailConsentLog,
    EmailEvent,
    EmailMessage,
    EmailProviderConfig,
    EmailRateLimit,
    EmailTemplate,
    EmailUnsubscribe,
)


# ---------------------------------------------------------------------------
# EmailTemplate admin
# ---------------------------------------------------------------------------

@admin.register(EmailTemplate)
class EmailTemplateAdmin(admin.ModelAdmin):
    list_display = (
        'slug', 'version', 'email_type', 'is_active',
        'usage_count', 'last_used', 'updated_at', 'preview_button',
    )
    list_filter = ('email_type', 'is_active')
    search_fields = ('slug', 'subject', 'description')
    readonly_fields = ('created_at', 'updated_at', 'last_used', 'usage_count', 'preview_button')
    ordering = ('slug', '-version')
    save_on_top = True
    fieldsets = (
        (None, {
            'fields': ('slug', 'version', 'email_type', 'is_active', 'description', 'parent_template'),
        }),
        ('Content', {
            'fields': ('subject', 'html_body', 'text_body'),
            'classes': ('wide',),
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at', 'last_used', 'usage_count', 'preview_button'),
            'classes': ('collapse',),
        }),
    )

    def preview_button(self, obj):
        if obj.pk:
            return format_html(
                '<a class="button" href="{}" target="_blank" '
                'style="background:#0ea5e9;color:#fff;padding:4px 12px;border-radius:4px;text-decoration:none;">'
                '👁 Preview</a>',
                f'/admin/email/emailtemplate/{obj.pk}/preview/',
            )
        return '—'
    preview_button.short_description = 'Preview'

    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path(
                '<uuid:pk>/preview/',
                self.admin_site.admin_view(self.preview_view),
                name='email_emailtemplate_preview',
            ),
        ]
        return custom + urls

    def preview_view(self, request, pk):
        """Render a template with sample context and return as HTML response."""
        from .template_engine import TemplateEngine
        try:
            obj = EmailTemplate.objects.get(pk=pk)
            _, html, _ = TemplateEngine.preview(
                template_slug=obj.slug,
                email_type=obj.email_type,
            )
            return HttpResponse(html, content_type='text/html; charset=utf-8')
        except Exception as exc:
            return HttpResponse(
                f'<pre style="color:red;padding:20px;">Preview error: {exc}</pre>',
                content_type='text/html',
            )

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        # Invalidate cache so the next render uses the updated content
        from .template_engine import TemplateEngine
        TemplateEngine.invalidate_cache(obj.slug, obj.version)

    actions = ['activate_templates', 'deactivate_templates', 'warm_cache']

    @admin.action(description='Activate selected templates')
    def activate_templates(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} template(s) activated.')

    @admin.action(description='Deactivate selected templates')
    def deactivate_templates(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} template(s) deactivated.')

    @admin.action(description='Warm Redis cache for selected templates')
    def warm_cache(self, request, queryset):
        from django.core.cache import cache
        count = 0
        from .template_engine import _cache_key, _cache_ttl
        for obj in queryset:
            try:
                cache.set(_cache_key(obj.slug, obj.version), obj.html_body, timeout=_cache_ttl())
                count += 1
            except Exception:
                pass
        self.message_user(request, f'Cached {count} template(s) in Redis.')


# ---------------------------------------------------------------------------
# EmailMessage admin
# ---------------------------------------------------------------------------

@admin.register(EmailMessage)
class EmailMessageAdmin(admin.ModelAdmin):
    list_display = (
        'short_id', 'email_type', 'status_badge', 'to_email',
        'subject', 'priority', 'retry_count', 'created_at',
    )
    list_filter = ('status', 'email_type', 'priority', 'provider_used')
    search_fields = ('to_email', 'subject', 'provider_message_id', 'id')
    readonly_fields = (
        'id', 'created_at', 'sent_at', 'failed_at',
        'provider_used', 'provider_message_id', 'error_message',
        'retry_count', 'template', 'rate_limit_key',
        'rendered_html_preview',
    )
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'
    fieldsets = (
        ('Addressing', {
            'fields': ('to_email', 'to_name', 'from_email', 'from_name', 'reply_to'),
        }),
        ('Content', {
            'fields': ('subject', 'body_html', 'body_text', 'rendered_html_preview'),
            'classes': ('collapse',),
        }),
        ('Status', {
            'fields': (
                'id', 'email_type', 'priority', 'status',
                'provider_used', 'provider_message_id',
                'retry_count', 'max_retries',
                'created_at', 'scheduled_at', 'sent_at', 'failed_at',
                'error_message',
            ),
        }),
        ('Meta', {
            'fields': ('user', 'template', 'metadata', 'rate_limit_key'),
            'classes': ('collapse',),
        }),
    )
    actions = ['resend_selected']

    def short_id(self, obj):
        return str(obj.id)[:8] + '…'
    short_id.short_description = 'ID'

    def status_badge(self, obj):
        colours = {
            'SENT': '#16a34a', 'DELIVERED': '#16a34a',
            'FAILED': '#dc2626', 'BOUNCED': '#dc2626',
            'PENDING': '#d97706', 'QUEUED': '#d97706', 'SENDING': '#0ea5e9',
        }
        colour = colours.get(obj.status, '#6b7280')
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;">{}</span>',
            colour, obj.status,
        )
    status_badge.short_description = 'Status'

    def rendered_html_preview(self, obj):
        if obj.rendered_html:
            return format_html(
                '<a href="#" onclick="window.open(\'data:text/html,\'+encodeURIComponent(this.dataset.html),\'preview\');return false;" '
                'data-html="{}" style="color:#0ea5e9;">Open preview in new tab</a>',
                obj.rendered_html.replace('"', '&quot;'),
            )
        return '—'
    rendered_html_preview.short_description = 'Preview rendered HTML'

    @admin.action(description='Re-send selected emails')
    def resend_selected(self, request, queryset):
        from .services import EmailService
        sent, failed = 0, 0
        for msg in queryset:
            try:
                EmailService.send_now(msg)
                sent += 1
            except Exception:
                failed += 1
        self.message_user(request, f'Re-sent {sent} email(s). {failed} failed.')


# ---------------------------------------------------------------------------
# EmailProviderConfig admin
# ---------------------------------------------------------------------------

@admin.register(EmailProviderConfig)
class EmailProviderConfigAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'provider_type', 'is_active', 'priority',
        'circuit_status', 'success_count', 'failure_count',
        'last_success', 'updated_at',
    )
    list_filter = ('provider_type', 'is_active', 'circuit_open')
    readonly_fields = (
        'circuit_open', 'degraded_until', 'success_count', 'failure_count',
        'last_success', 'last_failure', 'created_at', 'updated_at',
    )
    ordering = ('priority',)

    def circuit_status(self, obj):
        if obj.circuit_open:
            return format_html('<span style="color:#dc2626;font-weight:bold;">⚡ OPEN</span>')
        return format_html('<span style="color:#16a34a;">✓ Closed</span>')
    circuit_status.short_description = 'Circuit'

    actions = ['reset_circuit_breaker']

    @admin.action(description='Reset circuit breaker (force CLOSED)')
    def reset_circuit_breaker(self, request, queryset):
        from django.utils import timezone
        updated = queryset.update(
            circuit_open=False,
            degraded_until=None,
        )
        # Also clear Redis keys
        try:
            from django.core.cache import cache
            for obj in queryset:
                cache.delete(f'email:cb:{obj.name}:open_until')
                cache.delete(f'email:cb:{obj.name}:failures')
        except Exception:
            pass
        self.message_user(request, f'Reset circuit breaker for {updated} provider(s).')


# ---------------------------------------------------------------------------
# EmailUnsubscribe admin
# ---------------------------------------------------------------------------

@admin.register(EmailUnsubscribe)
class EmailUnsubscribeAdmin(admin.ModelAdmin):
    list_display = ('email', 'all_categories', 'categories', 'source', 'created_at')
    list_filter = ('all_categories', 'source')
    search_fields = ('email',)
    readonly_fields = ('created_at', 'updated_at', 'token')
    ordering = ('-created_at',)


# ---------------------------------------------------------------------------
# EmailConsentLog admin (read-only GDPR audit trail)
# ---------------------------------------------------------------------------

@admin.register(EmailConsentLog)
class EmailConsentLogAdmin(admin.ModelAdmin):
    list_display = ('email', 'action', 'category', 'ip_address', 'timestamp')
    list_filter = ('action',)
    search_fields = ('email',)
    readonly_fields = tuple(
        f.name for f in EmailConsentLog._meta.get_fields()
        if hasattr(f, 'name')
    )
    ordering = ('-timestamp',)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


# ---------------------------------------------------------------------------
# EmailEvent admin
# ---------------------------------------------------------------------------

@admin.register(EmailEvent)
class EmailEventAdmin(admin.ModelAdmin):
    list_display = ('event_type', 'message', 'ip_address', 'timestamp')
    list_filter = ('event_type',)
    readonly_fields = tuple(f.name for f in EmailEvent._meta.get_fields() if hasattr(f, 'name'))
    ordering = ('-timestamp',)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


# ---------------------------------------------------------------------------
# EmailRateLimit admin
# ---------------------------------------------------------------------------

@admin.register(EmailRateLimit)
class EmailRateLimitAdmin(admin.ModelAdmin):
    list_display = ('email', 'user', 'email_type', 'count', 'window_start', 'window_seconds')
    list_filter = ('email_type',)
    search_fields = ('email',)
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-window_start',)
