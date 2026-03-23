"""
Contact App Tests

Covers:
- Public submit endpoint: valid submission (anonymous + authenticated)
- Public submit endpoint: validation errors
- Public submit endpoint: consent required
- Public submit endpoint: rate throttle class wiring
- Admin inbox list endpoint: auth required, filters work
- Admin detail endpoint: returns replies
- Admin PATCH endpoint: status update
- Admin reply endpoint: creates reply record and updates message status
- Admin stats endpoint: returns aggregate counts
- Permissions: non-admin cannot reach admin endpoints
"""

from unittest.mock import patch, MagicMock

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from apps.contact.models import ContactMessage, ContactReply, ContactStatus, ContactCategory
from apps.contact.views import ContactSubmitThrottle, ContactSubmitUserThrottle

User = get_user_model()

# Use in-memory cache in tests so DRF throttle doesn't need Redis
LOCMEM_CACHE = {
    'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'},
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_admin(**kwargs):
    defaults = dict(email='admin@church.test', password='pass1234', role='ADMIN',
                    first_name='Admin', last_name='User')
    defaults.update(kwargs)
    return User.objects.create_user(**defaults)


def _make_member(**kwargs):
    defaults = dict(email='member@church.test', password='pass1234', role='MEMBER',
                    first_name='Member', last_name='User')
    defaults.update(kwargs)
    return User.objects.create_user(**defaults)


def _make_message(**kwargs):
    defaults = dict(
        sender_name='Alice',
        sender_email='alice@example.com',
        category=ContactCategory.GENERAL,
        subject='Hello',
        message='This is a test message.',
        consent=True,
    )
    defaults.update(kwargs)
    return ContactMessage.objects.create(**defaults)


VALID_PAYLOAD = {
    'sender_name': 'Bob Smith',
    'sender_email': 'bob@example.com',
    'category': 'SUPPORT',
    'subject': 'Need help',
    'message': 'Please help me with something.',
    'consent': True,
}


# ---------------------------------------------------------------------------
# Public submit tests
# ---------------------------------------------------------------------------

@override_settings(CACHES=LOCMEM_CACHE)
class PublicContactSubmitTests(TestCase):
    """POST /api/v1/contact/submit/ — public, no auth required."""

    def setUp(self):
        self.client = APIClient()
        self.url = '/api/v1/contact/submit/'
        # Clear throttle counters between test methods
        from django.core.cache import cache
        cache.clear()

    def _post(self, payload):
        """Post with email/notification side-effects mocked out."""
        with patch('apps.contact.views._send_admin_notification_email', return_value=False), \
             patch('apps.contact.views._notify_admins'):
            return self.client.post(self.url, payload, format='json')

    def test_anonymous_submit_succeeds(self):
        resp = self._post(VALID_PAYLOAD)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['status'], 'success')
        self.assertIn('id', resp.data)
        self.assertEqual(ContactMessage.objects.count(), 1)
        msg = ContactMessage.objects.first()
        self.assertEqual(msg.sender_name, VALID_PAYLOAD['sender_name'])
        self.assertEqual(msg.sender_email, VALID_PAYLOAD['sender_email'])
        self.assertEqual(msg.status, ContactStatus.NEW)
        self.assertIsNone(msg.user)

    def test_authenticated_user_linked_to_message(self):
        member = _make_member()
        self.client.force_authenticate(user=member)
        resp = self._post(VALID_PAYLOAD)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        msg = ContactMessage.objects.first()
        self.assertEqual(msg.user_id, member.id)

    def test_missing_required_fields_returns_400(self):
        for field in ('sender_name', 'sender_email', 'subject', 'message'):
            payload = dict(VALID_PAYLOAD)
            del payload[field]
            resp = self._post(payload)
            self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST,
                             f'Expected 400 when {field!r} is missing')
            self.assertIn(field, resp.data.get('errors', {}))

    def test_consent_false_returns_400(self):
        payload = dict(VALID_PAYLOAD, consent=False)
        resp = self._post(payload)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('consent', resp.data.get('errors', {}))

    def test_invalid_email_returns_400(self):
        payload = dict(VALID_PAYLOAD, sender_email='not-an-email')
        resp = self._post(payload)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_message_too_long_returns_400(self):
        payload = dict(VALID_PAYLOAD, message='x' * 5001)
        resp = self._post(payload)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_category_returns_400(self):
        payload = dict(VALID_PAYLOAD, category='INVALID')
        resp = self._post(payload)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_xss_payload_stored_safely(self):
        """XSS payloads are stored as-is in DB but must be escaped in emails."""
        xss = '<script>alert(1)</script>'
        payload = dict(VALID_PAYLOAD, sender_name=xss, subject=xss, message=xss)
        resp = self._post(payload)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        msg = ContactMessage.objects.first()
        # Stored verbatim (DB is not the injection point)
        self.assertEqual(msg.sender_name, xss)
        self.assertEqual(msg.subject, xss)
        self.assertEqual(msg.message, xss)

    def test_admin_email_escaped_in_notification(self):
        """_send_admin_notification_email must HTML-escape user inputs."""
        import html as html_module
        xss = '<script>alert(1)</script>'
        msg = _make_message(sender_name=xss, subject=xss, message=xss)

        # EmailService is imported locally inside the helper, so patch it at source
        with patch('apps.email.services.EmailService.send_email') as mock_send:
            from apps.contact.views import _send_admin_notification_email
            _send_admin_notification_email(msg)
            self.assertTrue(mock_send.called)
            call_kwargs = mock_send.call_args[1]
            body = call_kwargs.get('body_html', '')
            self.assertNotIn('<script>', body)
            self.assertIn(html_module.escape(xss), body)

    def test_reply_email_escaped(self):
        """_send_reply_email must HTML-escape reply text and original message."""
        import html as html_module
        xss = '<script>alert(2)</script>'
        msg = _make_message(message=xss)
        reply = ContactReply(
            contact_message=msg,
            reply_text=xss,
        )
        with patch('apps.email.services.EmailService.send_email') as mock_send:
            from apps.contact.views import _send_reply_email
            _send_reply_email(reply)
            self.assertTrue(mock_send.called)
            call_kwargs = mock_send.call_args[1]
            body = call_kwargs.get('body_html', '')
            self.assertNotIn('<script>', body)
            self.assertIn(html_module.escape(xss), body)

    def test_throttle_classes_applied(self):
        """PublicContactSubmitView must declare both throttle classes."""
        from apps.contact.views import PublicContactSubmitView
        throttle_types = [type(t) for t in [cls() for cls in PublicContactSubmitView.throttle_classes]]
        self.assertIn(ContactSubmitThrottle, PublicContactSubmitView.throttle_classes)
        self.assertIn(ContactSubmitUserThrottle, PublicContactSubmitView.throttle_classes)

    def test_optional_phone_field(self):
        payload = dict(VALID_PAYLOAD, sender_phone='+1 555-000-0000')
        resp = self._post(payload)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        msg = ContactMessage.objects.first()
        self.assertEqual(msg.sender_phone, '+1 555-000-0000')


# ---------------------------------------------------------------------------
# Admin inbox tests
# ---------------------------------------------------------------------------

@override_settings(CACHES=LOCMEM_CACHE)
class AdminContactInboxTests(TestCase):
    """Admin endpoints require ADMIN or MODERATOR role."""

    def setUp(self):
        self.admin = _make_admin()
        self.member = _make_member()
        self.client = APIClient()
        self.inbox_url = '/api/v1/contact/messages/'
        self.stats_url = '/api/v1/contact/stats/'

        # Seed messages
        self.msg1 = _make_message(category=ContactCategory.SUPPORT, status=ContactStatus.NEW)
        self.msg2 = _make_message(
            sender_name='Carol',
            sender_email='carol@example.com',
            category=ContactCategory.PRAYER,
            subject='Prayer needed',
            message='Please pray for me.',
            status=ContactStatus.REPLIED,
        )

    def test_unauthenticated_cannot_access_inbox(self):
        resp = self.client.get(self.inbox_url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_member_cannot_access_inbox(self):
        self.client.force_authenticate(user=self.member)
        resp = self.client.get(self.inbox_url)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_list_messages(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get(self.inbox_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['count'], 2)

    def test_filter_by_status(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get(self.inbox_url, {'status': 'NEW'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['count'], 1)
        self.assertEqual(resp.data['results'][0]['status'], 'NEW')

    def test_filter_by_category(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get(self.inbox_url, {'category': 'PRAYER'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['count'], 1)

    def test_search_by_name(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get(self.inbox_url, {'search': 'Carol'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['count'], 1)
        self.assertEqual(resp.data['results'][0]['sender_name'], 'Carol')

    def test_stats_endpoint(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get(self.stats_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['total'], 2)
        self.assertIn('by_status', resp.data)
        self.assertIn('by_category', resp.data)


# ---------------------------------------------------------------------------
# Admin detail + patch tests
# ---------------------------------------------------------------------------

@override_settings(CACHES=LOCMEM_CACHE)
class AdminContactDetailTests(TestCase):

    def setUp(self):
        self.admin = _make_admin()
        self.member = _make_member()
        self.client = APIClient()
        self.msg = _make_message()

    def _detail_url(self):
        return f'/api/v1/contact/messages/{self.msg.id}/'

    def test_admin_can_get_detail(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get(self._detail_url())
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['id'], str(self.msg.id))
        self.assertIn('replies', resp.data)
        self.assertIn('message', resp.data)

    def test_member_cannot_get_detail(self):
        self.client.force_authenticate(user=self.member)
        resp = self.client.get(self._detail_url())
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_update_status(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.patch(self._detail_url(), {'status': 'IN_PROGRESS'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.msg.refresh_from_db()
        self.assertEqual(self.msg.status, ContactStatus.IN_PROGRESS)

    def test_admin_can_update_notes(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.patch(self._detail_url(), {'admin_notes': 'Called back'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.msg.refresh_from_db()
        self.assertEqual(self.msg.admin_notes, 'Called back')

    def test_patch_ignores_non_allowed_fields(self):
        """PATCH must not allow changing sender_email or message."""
        self.client.force_authenticate(user=self.admin)
        original_email = self.msg.sender_email
        resp = self.client.patch(
            self._detail_url(),
            {'sender_email': 'hacker@evil.com'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.msg.refresh_from_db()
        # sender_email must remain unchanged
        self.assertEqual(self.msg.sender_email, original_email)


# ---------------------------------------------------------------------------
# Admin reply tests
# ---------------------------------------------------------------------------

@override_settings(CACHES=LOCMEM_CACHE)
class AdminContactReplyTests(TestCase):

    def setUp(self):
        self.admin = _make_admin()
        self.member = _make_member()
        self.client = APIClient()
        self.msg = _make_message()

    def _reply_url(self):
        return f'/api/v1/contact/messages/{self.msg.id}/reply/'

    def test_admin_can_reply(self):
        self.client.force_authenticate(user=self.admin)
        with patch('apps.contact.views._send_reply_email', return_value=True):
            resp = self.client.post(
                self._reply_url(),
                {'reply_text': 'We have received your message.'},
                format='json',
            )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['status'], 'success')
        # Reply record created
        self.assertEqual(ContactReply.objects.filter(contact_message=self.msg).count(), 1)
        # Message status updated to REPLIED
        self.msg.refresh_from_db()
        self.assertEqual(self.msg.status, ContactStatus.REPLIED)
        self.assertIsNotNone(self.msg.replied_at)

    def test_reply_linked_to_admin(self):
        self.client.force_authenticate(user=self.admin)
        with patch('apps.contact.views._send_reply_email', return_value=False):
            self.client.post(
                self._reply_url(),
                {'reply_text': 'Hello there.'},
                format='json',
            )
        reply = ContactReply.objects.get(contact_message=self.msg)
        self.assertEqual(reply.replied_by_id, self.admin.id)

    def test_member_cannot_reply(self):
        self.client.force_authenticate(user=self.member)
        resp = self.client.post(
            self._reply_url(),
            {'reply_text': 'Hello there.'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_empty_reply_text_returns_400(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(self._reply_url(), {'reply_text': ''}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reply_to_nonexistent_message_returns_404(self):
        self.client.force_authenticate(user=self.admin)
        import uuid
        fake_url = f'/api/v1/contact/messages/{uuid.uuid4()}/reply/'
        with patch('apps.contact.views._send_reply_email', return_value=False):
            resp = self.client.post(fake_url, {'reply_text': 'Hello.'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
