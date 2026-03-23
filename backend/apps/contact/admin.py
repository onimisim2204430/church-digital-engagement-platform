from django.contrib import admin
from .models import ContactMessage, ContactReply


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ('sender_name', 'sender_email', 'category', 'subject', 'status', 'created_at')
    list_filter = ('status', 'category')
    search_fields = ('sender_name', 'sender_email', 'subject')
    readonly_fields = ('id', 'created_at', 'updated_at', 'replied_at')


@admin.register(ContactReply)
class ContactReplyAdmin(admin.ModelAdmin):
    list_display = ('contact_message', 'replied_by', 'email_sent', 'created_at')
    readonly_fields = ('id', 'created_at')
