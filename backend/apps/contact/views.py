"""
Contact Views

Public endpoint for submitting contact messages (no auth required).
Admin endpoints for managing the contact inbox and replying.
"""
import html as html_module
import logging
import os
from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated, AllowAny

from apps.users.permissions import IsModerator as IsAdminOrModerator
from .models import ContactMessage, ContactReply, ContactStatus
from .serializers import (
    ContactMessageCreateSerializer,
    ContactMessageListSerializer,
    ContactMessageDetailSerializer,
    AdminReplyCreateSerializer,
)

logger = logging.getLogger('contact')


class ContactSubmitThrottle(AnonRateThrottle):
    """5 submissions per hour per IP for anonymous users."""
    scope = 'contact_submit'


class ContactSubmitUserThrottle(UserRateThrottle):
    """20 submissions per hour for authenticated users."""
    scope = 'contact_submit_user'


# Category → Gmail alias mapping (falls back to primary admin email)
CATEGORY_RECIPIENT_MAP = {
    'SUPPORT': getattr(settings, 'CONTACT_EMAIL_SUPPORT', None),
    'PRAYER': getattr(settings, 'CONTACT_EMAIL_PRAYER', None),
    'TECHNICAL': getattr(settings, 'CONTACT_EMAIL_TECHNICAL', None),
    'FINANCE': getattr(settings, 'CONTACT_EMAIL_FINANCE', None),
    'PARTNERSHIP': getattr(settings, 'CONTACT_EMAIL_PARTNERSHIP', None),
    'GENERAL': None,
}

_PRIMARY_ADMIN_EMAIL = (
    getattr(settings, 'ADMIN_EMAIL', None)
    or os.environ.get('ADMIN_EMAIL', '')
    or getattr(settings, 'EMAIL_HOST_USER', '')
    or 'admin@example.com'
)


def _get_recipient_for_category(category: str) -> str:
    """Return the admin email address for this category, falling back to primary."""
    alias = CATEGORY_RECIPIENT_MAP.get(category)
    return alias if alias else _PRIMARY_ADMIN_EMAIL


def _notify_admins(contact_message: ContactMessage) -> None:
    """
    Create an in-app notification for all admin users about a new contact message.
    Uses NotificationService; errors are caught and logged (fail-safe).
    """
    try:
        from django.contrib.auth import get_user_model
        from apps.notifications.services import NotificationService
        from apps.notifications.constants import NotificationType, NotificationPriority, SourceModule

        User = get_user_model()
        admins = User.objects.filter(role__in=['ADMIN', 'MODERATOR'], is_active=True)

        for admin in admins:
            NotificationService.notify_user(
                user=admin,
                notification_type=NotificationType.SYSTEM_ALERT,
                title='New Contact Message',
                message=(
                    f"New [{contact_message.get_category_display()}] message from "
                    f"{contact_message.sender_name}: \"{contact_message.subject}\""
                ),
                metadata={
                    'contact_message_id': str(contact_message.id),
                    'category': contact_message.category,
                    'sender_name': contact_message.sender_name,
                    'sender_email': contact_message.sender_email,
                    'action_url': f'/admin/contact-inbox?message={contact_message.id}',
                },
                priority=NotificationPriority.HIGH,
                source_module=SourceModule.OTHER,
            )
    except Exception:
        logger.exception('Failed to send admin notifications for contact message %s', contact_message.id)


def _send_admin_notification_email(contact_message: ContactMessage) -> bool:
    """
    Send an email to the category-mapped admin Gmail address.
    Returns True on success, False on failure.
    """
    try:
        from apps.email.services import EmailService
        from apps.email.constants import EmailType, EmailPriority

        recipient = _get_recipient_for_category(contact_message.category)
        category_label = contact_message.get_category_display()

        # Escape all user-supplied values to prevent XSS in the email body
        esc_name    = html_module.escape(contact_message.sender_name)
        esc_email   = html_module.escape(contact_message.sender_email)
        esc_phone   = html_module.escape(contact_message.sender_phone)
        esc_subject = html_module.escape(contact_message.subject)
        esc_pref    = html_module.escape(contact_message.preferred_contact)
        esc_message = html_module.escape(contact_message.message)
        esc_cat     = html_module.escape(category_label)

        phone_row = (
            f'<tr><td><strong>Phone</strong></td><td>{esc_phone}</td></tr>'
            if esc_phone else ''
        )

        body_html = f"""
<h2>New Contact Message — {esc_cat}</h2>
<table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%">
  <tr><td><strong>From</strong></td><td>{esc_name} &lt;{esc_email}&gt;</td></tr>
  {phone_row}
  <tr><td><strong>Category</strong></td><td>{esc_cat}</td></tr>
  <tr><td><strong>Subject</strong></td><td>{esc_subject}</td></tr>
  <tr><td><strong>Preferred contact</strong></td><td>{esc_pref}</td></tr>
  <tr><td><strong>Submitted</strong></td><td>{contact_message.created_at.strftime('%Y-%m-%d %H:%M UTC')}</td></tr>
</table>
<h3>Message</h3>
<p style="white-space:pre-wrap">{esc_message}</p>
<hr>
<p><small>Manage this message in the <a href="/admin/contact-inbox">Admin Contact Inbox</a>.</small></p>
"""

        EmailService.send_email(
            to_email=recipient,
            subject=f'[{category_label}] New Contact: {contact_message.subject}',
            body_html=body_html,
            reply_to=contact_message.sender_email,
            email_type=EmailType.NOTIFICATION,
            priority=EmailPriority.HIGH,
            async_send=True,
            skip_rate_limit=True,
        )
        return True
    except Exception:
        logger.exception('Failed to send admin email for contact message %s', contact_message.id)
        return False


def _send_reply_email(reply: ContactReply) -> bool:
    """
    Send admin reply email to the original sender.
    Returns True on success, False on failure.
    """
    try:
        from apps.email.services import EmailService
        from apps.email.constants import EmailType, EmailPriority

        contact_msg = reply.contact_message
        replier_name = (
            reply.replied_by.get_full_name()
            if reply.replied_by else 'The Team'
        )

        # Escape all user-supplied values to prevent XSS in the reply email
        esc_sender   = html_module.escape(contact_msg.sender_name)
        esc_subject  = html_module.escape(contact_msg.subject)
        esc_replier  = html_module.escape(replier_name)
        esc_reply    = html_module.escape(reply.reply_text)
        esc_orig_msg = html_module.escape(contact_msg.message)

        body_html = f"""
<h2>Re: {esc_subject}</h2>
<p>Dear {esc_sender},</p>
<p>Thank you for reaching out to us. {esc_replier} has responded to your message:</p>
<blockquote style="border-left:3px solid #ccc;padding-left:16px;margin:16px 0;white-space:pre-wrap">{esc_reply}</blockquote>
<p>Your original message:</p>
<blockquote style="border-left:3px solid #eee;padding-left:16px;color:#666;white-space:pre-wrap">{esc_orig_msg}</blockquote>
<hr>
<p><small>This is an automated response from Serene Sanctuary. Please do not reply directly to this email.</small></p>
"""

        EmailService.send_email(
            to_email=contact_msg.sender_email,
            to_name=contact_msg.sender_name,
            subject=f'Re: {contact_msg.subject}',
            body_html=body_html,
            email_type=EmailType.TRANSACTIONAL,
            priority=EmailPriority.HIGH,
            async_send=True,
            skip_rate_limit=True,
        )
        return True
    except Exception:
        logger.exception('Failed to send reply email for contact reply %s', reply.id)
        return False


class PublicContactSubmitView(APIView):
    """
    POST /api/v1/contact/submit/

    Public endpoint (no auth required). Accepts contact form submissions.
    Authenticated users have their identity optionally linked; anonymous users
    supply their own name/email.

    Rate limits (via DRF throttle):
        - Anonymous: 5 submissions/hour per IP  (ContactSubmitThrottle)
        - Authenticated: 20 submissions/hour    (ContactSubmitUserThrottle)
    """
    permission_classes = [AllowAny]
    throttle_classes = [ContactSubmitThrottle, ContactSubmitUserThrottle]

    def post(self, request):
        serializer = ContactMessageCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'status': 'error', 'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data

        # Link authenticated user if present
        user = request.user if request.user.is_authenticated else None

        contact_msg = ContactMessage.objects.create(
            sender_name=data['sender_name'],
            sender_email=data['sender_email'],
            sender_phone=data.get('sender_phone', ''),
            user=user,
            category=data['category'],
            subject=data['subject'],
            message=data['message'],
            preferred_contact=data.get('preferred_contact', 'email'),
            consent=data['consent'],
            status=ContactStatus.NEW,
        )

        # Send admin notification email (async)
        admin_email_sent = _send_admin_notification_email(contact_msg)
        if admin_email_sent:
            contact_msg.admin_email_sent = True
            contact_msg.save(update_fields=['admin_email_sent'])

        # Send in-app notifications to admins
        _notify_admins(contact_msg)
        contact_msg.notification_sent = True
        contact_msg.save(update_fields=['notification_sent'])

        logger.info(
            'Contact message submitted: id=%s category=%s sender=%s',
            contact_msg.id, contact_msg.category, contact_msg.sender_email,
        )

        return Response(
            {
                'status': 'success',
                'message': 'Your message has been received. We will get back to you soon.',
                'id': str(contact_msg.id),
            },
            status=status.HTTP_201_CREATED,
        )


class AdminContactInboxView(ListAPIView):
    """
    GET /api/v1/admin/contact/messages/?status=NEW&category=SUPPORT&...

    Admin endpoint: list contact messages with filters.
    """
    permission_classes = [IsAuthenticated, IsAdminOrModerator]
    serializer_class = ContactMessageListSerializer

    def get_queryset(self):
        qs = ContactMessage.objects.all()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        search = self.request.query_params.get('search')
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(sender_name__icontains=search) |
                Q(sender_email__icontains=search) |
                Q(subject__icontains=search)
            )
        return qs.order_by('-created_at')


class AdminContactMessageDetailView(RetrieveUpdateAPIView):
    """
    GET /api/v1/admin/contact/messages/<id>/
    PATCH /api/v1/admin/contact/messages/<id>/  — update status, notes, assignee
    """
    permission_classes = [IsAuthenticated, IsAdminOrModerator]
    serializer_class = ContactMessageDetailSerializer
    queryset = ContactMessage.objects.all()
    lookup_field = 'id'

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        allowed = {'status', 'admin_notes', 'assigned_to'}
        data = {k: v for k, v in request.data.items() if k in allowed}

        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)


class AdminContactReplyView(APIView):
    """
    POST /api/v1/admin/contact/messages/<id>/reply/

    Admin replies to a contact message. Sends email to the original sender.
    """
    permission_classes = [IsAuthenticated, IsAdminOrModerator]

    def post(self, request, id):
        try:
            contact_msg = ContactMessage.objects.get(id=id)
        except ContactMessage.DoesNotExist:
            return Response({'error': 'Message not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = AdminReplyCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'status': 'error', 'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reply = ContactReply.objects.create(
            contact_message=contact_msg,
            replied_by=request.user,
            reply_text=serializer.validated_data['reply_text'],
        )

        # Send email to original sender
        sent = _send_reply_email(reply)
        if sent:
            reply.email_sent = True
            reply.email_sent_at = timezone.now()
            reply.save(update_fields=['email_sent', 'email_sent_at'])

        # Update message status
        contact_msg.status = ContactStatus.REPLIED
        contact_msg.replied_at = timezone.now()
        contact_msg.save(update_fields=['status', 'replied_at'])

        logger.info(
            'Admin reply sent: message_id=%s replied_by=%s email_sent=%s',
            contact_msg.id, request.user.email, sent,
        )

        return Response(
            {
                'status': 'success',
                'message': 'Reply sent successfully.',
                'email_sent': sent,
                'reply': {
                    'id': str(reply.id),
                    'reply_text': reply.reply_text,
                    'email_sent': reply.email_sent,
                    'created_at': reply.created_at.isoformat(),
                },
            },
            status=status.HTTP_201_CREATED,
        )


class AdminContactStatsView(APIView):
    """
    GET /api/v1/admin/contact/stats/

    Returns aggregate counts by status and category.
    """
    permission_classes = [IsAuthenticated, IsAdminOrModerator]

    def get(self, request):
        from django.db.models import Count
        status_counts = (
            ContactMessage.objects
            .values('status')
            .annotate(count=Count('id'))
        )
        category_counts = (
            ContactMessage.objects
            .values('category')
            .annotate(count=Count('id'))
        )
        return Response({
            'status': 'success',
            'by_status': {row['status']: row['count'] for row in status_counts},
            'by_category': {row['category']: row['count'] for row in category_counts},
            'total': ContactMessage.objects.count(),
        })
