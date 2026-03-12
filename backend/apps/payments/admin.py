"""Admin configuration for payment transactions."""

from django.contrib import admin

from .models import PaymentTransaction, PaymentIntent, PaymentAuditLog


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    """Read-oriented admin list for payments operations and audit."""

    list_display = (
        'reference',
        'email',
        'amount',
        'currency',
        'status',
        'payment_method',
        'paid_at',
        'created_at',
    )
    search_fields = ('reference', 'email', 'gateway_response')
    list_filter = ('status', 'currency', 'payment_method', 'created_at')
    readonly_fields = ('id', 'created_at', 'updated_at', 'paid_at', 'reference')


@admin.register(PaymentIntent)
class PaymentIntentAdmin(admin.ModelAdmin):
    """Intent pre-authorization records for fraud prevention."""

    list_display = (
        'email',
        'amount',
        'purpose',
        'is_used',
        'is_expired',
        'created_at',
        'expires_at',
    )
    search_fields = ('email', 'purpose')
    list_filter = ('is_used', 'created_at', 'expires_at')
    readonly_fields = ('id', 'created_at', 'used_at')
    fieldsets = (
        ('Intent Details', {
            'fields': ('id', 'email', 'amount', 'currency', 'purpose'),
        }),
        ('Authorization', {
            'fields': ('user', 'transaction', 'is_used', 'used_at'),
        }),
        ('Expiration', {
            'fields': ('expires_at', 'created_at'),
        }),
        ('Request Context', {
            'fields': ('ip_address', 'user_agent'),
            'classes': ('collapse',),
        }),
        ('Metadata', {
            'fields': ('metadata',),
            'classes': ('collapse',),
        }),
    )


@admin.register(PaymentAuditLog)
class PaymentAuditLogAdmin(admin.ModelAdmin):
    """Immutable audit trail for compliance and debugging."""

    list_display = (
        'event_type',
        'severity',
        'transaction',
        'intent',
        'status_code',
        'created_at',
    )
    search_fields = ('message', 'transaction__reference', 'intent__email')
    list_filter = ('event_type', 'severity', 'created_at', 'status_code')
    readonly_fields = ('id', 'created_at', 'transaction', 'intent')
    
    fieldsets = (
        ('Event', {
            'fields': ('id', 'event_type', 'severity', 'message'),
        }),
        ('Related Records', {
            'fields': ('transaction', 'intent'),
        }),
        ('Request Context', {
            'fields': ('ip_address', 'user_agent', 'request_path', 'request_method'),
        }),
        ('Response', {
            'fields': ('status_code', 'response_data', 'error_details'),
        }),
        ('Timestamps', {
            'fields': ('created_at',),
        }),
    )
    
    # Make audit logs read-only
    def has_add_permission(self, request):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
