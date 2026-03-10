"""
Tests for apps/email/services.py (Phase 3)

Covers:
- send_email() with raw subject/body_html (legacy path)
- send_email() with template_slug (Phase 3 path)
- Rate limit enforcement: RateLimitExceeded is propagated
- Unsubscribe check: message created with FAILED status, not sent
- async_send=True enqueues to Celery (mocked)
- async_send=False sends synchronously via provider
- CC / BCC / attachments pass through to EmailPayload
- send_bulk() dispatches all recipients
- render_template() returns (subject, html, text) without creating DB records
- get_user_email_preferences() returns opt-out dict
- Invalid email address raises EmailServiceError
"""

from unittest.mock import MagicMock, patch, call

from django.test import TestCase, override_settings

from apps.email.constants import EmailStatus, EmailType, EmailPriority


def _make_send_result(success=True, provider_name='smtp', error_message=''):
    result = MagicMock()
    result.success = success
    result.provider_name = provider_name
    result.provider_message_id = 'msg-123'
    result.error_message = error_message
    return result


class SendEmailLegacyPathTests(TestCase):
    """send_email() with raw subject / body_html (no template_slug)."""

    def setUp(self):
        # Patch provider registry at module level
        patcher = patch('apps.email.services.provider_registry')
        self.mock_registry = patcher.start()
        self.mock_registry.send_with_failover.return_value = _make_send_result()
        self.addCleanup(patcher.stop)

    def test_creates_email_message_record(self):
        from apps.email.services import EmailService
        from apps.email.models import EmailMessage

        msg = EmailService.send_email(
            to_email='user@example.com',
            subject='Test Subject',
            body_html='<p>Test body</p>',
            async_send=False,
            skip_rate_limit=True,
        )

        self.assertIsNotNone(msg.id)
        self.assertEqual(msg.to_email, 'user@example.com')
        self.assertEqual(msg.subject, 'Test Subject')

    def test_sync_send_marks_message_sent(self):
        from apps.email.services import EmailService

        msg = EmailService.send_email(
            to_email='user@example.com',
            subject='Sync Send Test',
            body_html='<p>Hello</p>',
            async_send=False,
            skip_rate_limit=True,
        )

        msg.refresh_from_db()
        self.assertEqual(msg.status, EmailStatus.SENT)

    def test_failed_provider_marks_message_failed(self):
        self.mock_registry.send_with_failover.return_value = _make_send_result(
            success=False, error_message='Connection refused'
        )
        from apps.email.services import EmailService

        msg = EmailService.send_email(
            to_email='user@example.com',
            subject='Fail Test',
            body_html='<p>fail</p>',
            async_send=False,
            skip_rate_limit=True,
        )

        msg.refresh_from_db()
        self.assertEqual(msg.status, EmailStatus.FAILED)
        self.assertIn('Connection refused', msg.error_message)

    def test_email_normalised_to_lowercase(self):
        from apps.email.services import EmailService

        msg = EmailService.send_email(
            to_email='USER@EXAMPLE.COM',
            subject='Normalise',
            body_html='<p>x</p>',
            async_send=False,
            skip_rate_limit=True,
        )

        self.assertEqual(msg.to_email, 'user@example.com')

    def test_invalid_email_raises_service_error(self):
        from apps.email.services import EmailService, EmailServiceError

        with self.assertRaises(EmailServiceError):
            EmailService.send_email(
                to_email='notanemail',
                subject='Bad Email',
                body_html='<p>x</p>',
                async_send=False,
                skip_rate_limit=True,
            )

    def test_async_send_enqueues_task(self):
        from apps.email.services import EmailService

        with patch('apps.email.services.EmailService._enqueue') as mock_enqueue:
            msg = EmailService.send_email(
                to_email='user@example.com',
                subject='Async Test',
                body_html='<p>async</p>',
                async_send=True,
                skip_rate_limit=True,
            )

        mock_enqueue.assert_called_once_with(msg)


class SendEmailTemplatePathTests(TestCase):
    """send_email() with template_slug (Phase 3)."""

    def setUp(self):
        patcher = patch('apps.email.services.provider_registry')
        self.mock_registry = patcher.start()
        self.mock_registry.send_with_failover.return_value = _make_send_result()
        self.addCleanup(patcher.stop)

    def test_template_slug_renders_and_sends(self):
        from apps.email.services import EmailService

        rendered = ('Verify Your Email', '<h1>Click here</h1>', 'Click here')

        with patch('apps.email.services.EmailService._render_template') as mock_render:
            mock_render.return_value = (*rendered, None)
            msg = EmailService.send_email(
                to_email='user@example.com',
                template_slug='verification',
                context={'verification_url': 'https://example.com/verify/abc'},
                async_send=False,
                skip_rate_limit=True,
            )

        mock_render.assert_called_once()
        self.assertEqual(msg.subject, 'Verify Your Email')
        self.assertEqual(msg.rendered_html, '<h1>Click here</h1>')

    def test_render_failure_raises_service_error(self):
        from apps.email.services import EmailService, EmailServiceError

        with patch('apps.email.services.EmailService._render_template') as mock_render:
            mock_render.side_effect = EmailServiceError('Template not found')
            with self.assertRaises(EmailServiceError):
                EmailService.send_email(
                    to_email='user@example.com',
                    template_slug='nonexistent',
                    async_send=False,
                    skip_rate_limit=True,
                )

    def test_rate_limit_exceeded_propagates(self):
        from apps.email.rate_limiter import RateLimitExceeded
        from apps.email.services import EmailService

        exc = RateLimitExceeded(
            message='Limit exceeded.',
            limit_type='user', email_type='NOTIFICATION',
            limit=10, window_seconds=3600, retry_after=600,
        )
        with patch('apps.email.services.EmailService._check_rate_limit', side_effect=exc):
            with self.assertRaises(RateLimitExceeded):
                EmailService.send_email(
                    to_email='user@example.com',
                    subject='Blocked',
                    body_html='<p>x</p>',
                    async_send=False,
                )

    def test_rate_limit_key_stored_on_message(self):
        from apps.email.services import EmailService

        with patch('apps.email.services.EmailService._check_rate_limit',
                   return_value='email:rl:user:NOTIFICATION:user@example.com'):
            msg = EmailService.send_email(
                to_email='user@example.com',
                subject='Key Test',
                body_html='<p>x</p>',
                async_send=False,
            )

        self.assertEqual(msg.rate_limit_key, 'email:rl:user:NOTIFICATION:user@example.com')


class UnsubscribeTests(TestCase):
    """Unsubscribed recipients get a FAILED record, not a send."""

    def setUp(self):
        patcher = patch('apps.email.services.provider_registry')
        self.mock_registry = patcher.start()
        self.addCleanup(patcher.stop)

    def test_unsubscribed_address_creates_failed_record(self):
        from apps.email.services import EmailService

        with patch('apps.email.services.EmailService._is_unsubscribed', return_value=True):
            msg = EmailService.send_email(
                to_email='unsubscribed@example.com',
                subject='Test',
                body_html='<p>x</p>',
                async_send=False,
                skip_rate_limit=True,
            )

        self.assertEqual(msg.status, EmailStatus.FAILED)
        self.assertIn('unsubscribed', msg.error_message.lower())
        self.mock_registry.send_with_failover.assert_not_called()

    def test_security_alert_always_sends(self):
        from apps.email.services import EmailService

        with patch('apps.email.services.provider_registry') as mock_reg:
            mock_reg.send_with_failover.return_value = _make_send_result()
            # SECURITY_ALERT bypasses unsubscribe check
            msg = EmailService.send_email(
                to_email='unsubscribed@example.com',
                subject='Security Test',
                body_html='<p>security</p>',
                email_type=EmailType.SECURITY_ALERT,
                async_send=False,
                skip_rate_limit=True,
            )

        self.assertNotEqual(msg.status, EmailStatus.FAILED)


class SendBulkTests(TestCase):
    """send_bulk() dispatches to all recipients."""

    def test_send_bulk_returns_list_of_messages(self):
        from apps.email.services import EmailService

        recipients = [
            {'email': 'a@example.com', 'name': 'Alice'},
            {'email': 'b@example.com', 'name': 'Bob'},
        ]
        with patch.object(EmailService, 'send_email') as mock_send:
            mock_send.return_value = MagicMock()
            results = EmailService.send_bulk(
                recipients=recipients,
                template_slug='notification',
                context_base={'msg': 'hello'},
                async_send=False,
            )

        self.assertEqual(mock_send.call_count, 2)
        self.assertEqual(len(results), 2)

    def test_send_bulk_skips_failed_recipients(self):
        from apps.email.services import EmailService

        recipients = [
            {'email': 'good@example.com'},
            {'email': 'bad@example.com'},
        ]

        def side_effect(**kwargs):
            if kwargs.get('to_email') == 'bad@example.com':
                raise Exception('Forced failure')
            return MagicMock()

        with patch.object(EmailService, 'send_email', side_effect=side_effect):
            results = EmailService.send_bulk(
                recipients=recipients,
                template_slug='notification',
                async_send=False,
            )

        self.assertEqual(len(results), 1)


class RenderTemplatePublicAPITests(TestCase):
    """render_template() returns (subject, html, text) without side-effects."""

    def test_render_template_no_db_record_created(self):
        from apps.email.services import EmailService
        from apps.email.models import EmailMessage

        before_count = EmailMessage.objects.count()

        with patch('apps.email.services.EmailService._render_template',
                   return_value=('Subject', '<html>', 'text', None)):
            subject, html, text = EmailService.render_template(
                template_slug='test',
                context={'key': 'value'},
            )

        self.assertEqual(subject, 'Subject')
        self.assertEqual(html, '<html>')
        self.assertEqual(EmailMessage.objects.count(), before_count)


class GetUserEmailPreferencesTests(TestCase):

    def test_no_unsubscribes_returns_base_prefs(self):
        from apps.email.services import EmailService

        prefs = EmailService.get_user_email_preferences(user_id=9999)
        self.assertIn('all', prefs)
        self.assertFalse(prefs['all'])

    def test_all_categories_unsubscribe_sets_all_true(self):
        from apps.email.services import EmailService

        # Patch the model class inside the models module (local import in method)
        with patch('apps.email.models.EmailUnsubscribe') as MockUnsub:
            MockUnsub.objects.filter.return_value.values.return_value = [
                {'all_categories': True, 'categories': []}
            ]
            prefs = EmailService.get_user_email_preferences(user_id=1)

        self.assertTrue(prefs['all'])
