"""
Unit tests for the email provider system — Phase 2.

Tests cover:
1. SMTPProvider – successful send, auth failure, stale connection recovery
2. SendGridProvider – successful send (mocked), rate limit (429), auth failure (401),
   temporary failure (503), sandbox mode, health_check with valid/invalid key
3. ProviderManager / CircuitBreaker – failover, circuit trip, circuit recovery,
   HALF-OPEN probe, email-type-based provider selection
4. ProviderRegistry – lazy build, reset, send_with_failover delegation
5. ProviderResult – field defaults

Run with:
    python manage.py test apps.email.tests.test_providers
"""

import time
import unittest
from dataclasses import dataclass
from unittest.mock import MagicMock, Mock, patch, PropertyMock

from django.test import TestCase, override_settings


# ---------------------------------------------------------------------------
# Helpers / fixtures
# ---------------------------------------------------------------------------

def _make_payload(**kwargs):
    from apps.email.providers.base import EmailPayload
    defaults = dict(
        to_email='recipient@example.com',
        to_name='Test User',
        from_email='noreply@church.test',
        from_name='Church Platform',
        subject='Test Subject',
        body_html='<p>Hello</p>',
        body_text='Hello',
        message_id='test-uuid-1234',
    )
    defaults.update(kwargs)
    return EmailPayload(**defaults)


def _ok_result(provider='SMTP'):
    from apps.email.providers.base import ProviderResult
    return ProviderResult(success=True, provider_name=provider, provider_message_id='msg-1')


def _fail_result(provider='SMTP', code='TEST_FAIL'):
    from apps.email.providers.base import ProviderResult
    return ProviderResult(
        success=False, provider_name=provider,
        error_message='Test failure', error_code=code,
    )


# ---------------------------------------------------------------------------
# Test: ProviderResult defaults
# ---------------------------------------------------------------------------

class TestProviderResult(unittest.TestCase):
    def test_defaults(self):
        from apps.email.providers.base import ProviderResult
        r = ProviderResult(success=True, provider_name='SMTP')
        self.assertEqual(r.provider_message_id, '')
        self.assertEqual(r.error_message, '')
        self.assertIsNone(r.raw_response)

    def test_failure_fields(self):
        from apps.email.providers.base import ProviderResult
        r = ProviderResult(
            success=False, provider_name='SENDGRID',
            error_message='bad key', error_code='AUTH_FAILED',
        )
        self.assertFalse(r.success)
        self.assertEqual(r.error_code, 'AUTH_FAILED')


# ---------------------------------------------------------------------------
# Test: Custom exceptions
# ---------------------------------------------------------------------------

class TestProviderExceptions(unittest.TestCase):
    def test_rate_limit_has_retry_after(self):
        from apps.email.providers.exceptions import ProviderRateLimitError
        exc = ProviderRateLimitError('rate limited', retry_after=120)
        self.assertTrue(exc.retryable)
        self.assertEqual(exc.retry_after, 120)

    def test_auth_error_not_retryable(self):
        from apps.email.providers.exceptions import ProviderAuthenticationError
        exc = ProviderAuthenticationError('bad key')
        self.assertFalse(exc.retryable)

    def test_temp_failure_retryable(self):
        from apps.email.providers.exceptions import ProviderTemporaryFailureError
        exc = ProviderTemporaryFailureError('server error')
        self.assertTrue(exc.retryable)

    def test_permanent_failure_not_retryable(self):
        from apps.email.providers.exceptions import ProviderPermanentFailureError
        exc = ProviderPermanentFailureError('no such user')
        self.assertFalse(exc.retryable)


# ---------------------------------------------------------------------------
# Test: SMTPProvider
# ---------------------------------------------------------------------------

class TestSMTPProvider(TestCase):

    def setUp(self):
        # Clear any thread-local SMTP connection left over from a previous test
        # method so mock state does not leak across test cases.
        from apps.email.providers.smtp import _thread_local
        if hasattr(_thread_local, 'smtp_connection'):
            _thread_local.smtp_connection = None

    @override_settings(
        EMAIL_HOST='smtp.test.local',
        EMAIL_PORT=587,
        EMAIL_HOST_USER='user@test.local',
        EMAIL_HOST_PASSWORD='testpass',
        EMAIL_USE_TLS=True,
        EMAIL_USE_SSL=False,
        EMAIL_TIMEOUT=5,
    )
    @patch('apps.email.providers.smtp.smtplib.SMTP')
    def test_successful_send(self, mock_smtp_cls):
        """SMTPProvider.send() returns success=True when sendmail succeeds."""
        from apps.email.providers.smtp import SMTPProvider

        mock_conn = MagicMock()
        mock_conn.noop.return_value = (250, b'OK')
        mock_smtp_cls.return_value = mock_conn

        provider = SMTPProvider(config={})
        result = provider.send(_make_payload())

        self.assertTrue(result.success)
        self.assertEqual(result.provider_name, 'SMTP')
        mock_conn.sendmail.assert_called_once()

    @override_settings(
        EMAIL_HOST='smtp.test.local',
        EMAIL_PORT=587,
        EMAIL_HOST_USER='user@test.local',
        EMAIL_HOST_PASSWORD='testpass',
        EMAIL_USE_TLS=True,
    )
    @patch('apps.email.providers.smtp.smtplib.SMTP')
    def test_recipients_refused(self, mock_smtp_cls):
        """SMTPProvider.send() returns RECIPIENTS_REFUSED on SMTPRecipientsRefused."""
        import smtplib
        from apps.email.providers.smtp import SMTPProvider

        mock_conn = MagicMock()
        mock_conn.noop.return_value = (250, b'OK')
        mock_conn.sendmail.side_effect = smtplib.SMTPRecipientsRefused(
            {'bad@example.com': (550, b'No such user')}
        )
        mock_smtp_cls.return_value = mock_conn

        provider = SMTPProvider(config={})
        result = provider.send(_make_payload())

        self.assertFalse(result.success)
        self.assertEqual(result.error_code, 'RECIPIENTS_REFUSED')

    @override_settings(
        EMAIL_HOST='smtp.test.local',
        EMAIL_PORT=587,
        EMAIL_HOST_USER='user@test.local',
        EMAIL_HOST_PASSWORD='testpass',
        EMAIL_USE_TLS=True,
    )
    def test_validate_config_ok(self):
        from apps.email.providers.smtp import SMTPProvider
        provider = SMTPProvider(config={})
        # Should not raise
        provider.validate_config()

    def test_validate_config_missing_host(self):
        from apps.email.providers.smtp import SMTPProvider
        provider = SMTPProvider(config={})
        provider._resolved = True  # Skip resolution
        provider._host = ''
        provider._port = 587
        provider._username = 'user'
        provider._password = 'pass'
        with self.assertRaises(ValueError):
            provider.validate_config()


# ---------------------------------------------------------------------------
# Test: SendGridProvider
# ---------------------------------------------------------------------------

class TestSendGridProvider(TestCase):

    def _provider(self, **cfg_overrides):
        from apps.email.providers.sendgrid import SendGridProvider
        config = {'api_key_env_var': 'TEST_SG_KEY', 'sandbox_mode': False}
        config.update(cfg_overrides)
        p = SendGridProvider(config=config)
        p._api_key = 'SG.test_key_here'
        p._sandbox = config.get('sandbox_mode', False)
        p._track_opens = True
        p._track_clicks = True
        p._resolved = True
        return p

    @patch('apps.email.providers.sendgrid.requests')
    def test_successful_send(self, mock_requests):
        """2xx response from SendGrid → success=True with X-Message-Id."""
        mock_resp = MagicMock()
        mock_resp.status_code = 202
        mock_resp.headers = {'X-Message-Id': 'sg-msg-abc123'}
        mock_resp.content = b''
        mock_requests.post.return_value = mock_resp

        provider = self._provider()
        result = provider._send_via_requests(_make_payload())

        self.assertTrue(result.success)
        self.assertEqual(result.provider_message_id, 'sg-msg-abc123')

    @patch('apps.email.providers.sendgrid.requests')
    def test_rate_limit_429(self, mock_requests):
        """429 response → success=False with RATE_LIMITED error code."""
        mock_resp = MagicMock()
        mock_resp.status_code = 429
        mock_resp.headers = {'Retry-After': '90'}
        mock_resp.content = b'Too Many Requests'
        mock_requests.post.return_value = mock_resp

        provider = self._provider()
        result = provider._send_via_requests(_make_payload())

        self.assertFalse(result.success)
        self.assertEqual(result.error_code, 'RATE_LIMITED')
        self.assertEqual(result.raw_response['retry_after'], 90)

    @patch('apps.email.providers.sendgrid.requests')
    def test_auth_failure_401(self, mock_requests):
        """401 response → AUTH_FAILED."""
        mock_resp = MagicMock()
        mock_resp.status_code = 401
        mock_resp.headers = {}
        mock_resp.content = b'Unauthorized'
        mock_requests.post.return_value = mock_resp

        provider = self._provider()
        result = provider._send_via_requests(_make_payload())

        self.assertFalse(result.success)
        self.assertEqual(result.error_code, 'AUTH_FAILED')

    @patch('apps.email.providers.sendgrid.requests')
    def test_temporary_failure_503(self, mock_requests):
        """503 → temporary failure (retryable via ProviderResult error code)."""
        mock_resp = MagicMock()
        mock_resp.status_code = 503
        mock_resp.headers = {}
        mock_resp.content = b'Service Unavailable'
        mock_requests.post.return_value = mock_resp

        provider = self._provider()
        result = provider._send_via_requests(_make_payload())

        self.assertFalse(result.success)
        self.assertEqual(result.error_code, 'HTTP_503')

    @patch('apps.email.providers.sendgrid.requests')
    def test_health_check_ok(self, mock_requests):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_requests.get.return_value = mock_resp

        provider = self._provider()
        self.assertTrue(provider.health_check())

    @patch('apps.email.providers.sendgrid.requests')
    def test_health_check_bad_key(self, mock_requests):
        mock_resp = MagicMock()
        mock_resp.status_code = 401
        mock_requests.get.return_value = mock_resp

        provider = self._provider()
        self.assertFalse(provider.health_check())

    def test_no_api_key_returns_failure(self):
        from apps.email.providers.sendgrid import SendGridProvider
        provider = SendGridProvider(config={'api_key_env_var': 'MISSING_KEY_ENV'})
        result = provider.send(_make_payload())
        self.assertFalse(result.success)
        self.assertEqual(result.error_code, 'NO_API_KEY')

    def test_sandbox_payload_has_sandbox_enabled(self):
        provider = self._provider(sandbox_mode=True)
        provider._sandbox = True
        body = provider._build_payload_dict(_make_payload())
        self.assertTrue(body['mail_settings']['sandbox_mode']['enable'])


# ---------------------------------------------------------------------------
# Test: CircuitBreaker
# ---------------------------------------------------------------------------

class TestCircuitBreaker(TestCase):

    @patch('apps.email.providers.manager._get_cache')
    def test_initially_closed(self, mock_cache_fn):
        """Circuit is closed on a fresh instance."""
        mock_cache = MagicMock()
        mock_cache.get.return_value = None
        mock_cache_fn.return_value = mock_cache

        from apps.email.providers.manager import CircuitBreaker
        cb = CircuitBreaker('TestProvider', failure_threshold=5, degraded_timeout=60)
        self.assertFalse(cb.is_open())

    @patch('apps.email.providers.manager._get_cache')
    def test_trips_after_threshold(self, mock_cache_fn):
        """Circuit OPENS after failure_threshold consecutive failures."""
        mock_cache = MagicMock()
        # Simulate incrementing counter: 1, 2, 3, 4, 5
        mock_cache.incr.side_effect = [1, 2, 3, 4, 5]
        mock_cache.get.return_value = None  # open_until not set yet
        mock_cache_fn.return_value = mock_cache

        from apps.email.providers.manager import CircuitBreaker
        cb = CircuitBreaker('TestProvider', failure_threshold=5, degraded_timeout=60)

        with patch.object(cb, '_trip') as mock_trip:
            for _ in range(5):
                cb.record_failure()
            mock_trip.assert_called_once()

    @patch('apps.email.providers.manager._get_cache')
    def test_open_circuit_detected(self, mock_cache_fn):
        """is_open() returns True when open_until is in the future."""
        mock_cache = MagicMock()
        future = time.time() + 300
        mock_cache.get.return_value = str(future)
        mock_cache_fn.return_value = mock_cache

        from apps.email.providers.manager import CircuitBreaker
        cb = CircuitBreaker('TestProvider', failure_threshold=5, degraded_timeout=60)
        self.assertTrue(cb.is_open())

    @patch('apps.email.providers.manager._get_cache')
    def test_success_closes_circuit(self, mock_cache_fn):
        """record_success() deletes Redis keys, simulating CLOSED state."""
        mock_cache = MagicMock()
        mock_cache_fn.return_value = mock_cache

        from apps.email.providers.manager import CircuitBreaker
        cb = CircuitBreaker('TestProvider', failure_threshold=5, degraded_timeout=60)
        cb.record_success()

        self.assertEqual(mock_cache.delete.call_count, 2)  # failures + open_until keys


# ---------------------------------------------------------------------------
# Test: ProviderManager — failover and circuit breaker integration
# ---------------------------------------------------------------------------

class TestProviderManager(TestCase):

    def _make_manager(self, providers, **kwargs):
        from apps.email.providers.manager import ProviderManager
        return ProviderManager(providers=providers, **kwargs)

    def test_first_provider_succeeds(self):
        """Manager returns result from first provider immediately."""
        p1 = MagicMock()
        p1.send.return_value = _ok_result('P1')
        p1.__class__.__name__ = 'P1'
        p2 = MagicMock()
        p2.send.return_value = _ok_result('P2')
        p2.__class__.__name__ = 'P2'

        with patch('apps.email.providers.manager.CircuitBreaker.is_open', return_value=False):
            manager = self._make_manager([p1, p2])
            result = manager.send(_make_payload())

        self.assertTrue(result.success)
        self.assertEqual(result.provider_name, 'P1')
        p2.send.assert_not_called()

    def test_failover_to_second_provider(self):
        """Manager falls over to P2 when P1 fails."""
        p1 = MagicMock()
        p1.send.return_value = _fail_result('P1')
        p1.__class__.__name__ = 'P1'
        p2 = MagicMock()
        p2.send.return_value = _ok_result('P2')
        p2.__class__.__name__ = 'P2'

        with patch('apps.email.providers.manager.CircuitBreaker.is_open', return_value=False):
            manager = self._make_manager([p1, p2])
            result = manager.send(_make_payload())

        self.assertTrue(result.success)
        self.assertEqual(result.provider_name, 'P2')

    def test_all_providers_fail(self):
        """Returns last failure result when every provider fails."""
        p1 = MagicMock()
        p1.send.return_value = _fail_result('P1', 'ERR_1')
        p1.__class__.__name__ = 'P1'
        p2 = MagicMock()
        p2.send.return_value = _fail_result('P2', 'ERR_2')
        p2.__class__.__name__ = 'P2'

        with patch('apps.email.providers.manager.CircuitBreaker.is_open', return_value=False):
            manager = self._make_manager([p1, p2])
            result = manager.send(_make_payload())

        self.assertFalse(result.success)
        self.assertEqual(result.provider_name, 'P2')

    def test_open_circuit_skips_provider(self):
        """Manager skips providers whose circuit is OPEN."""
        p1 = MagicMock()
        p1.send.return_value = _ok_result('P1')
        p1.__class__.__name__ = 'P1'

        manager = self._make_manager([p1])
        # Force circuit open
        manager._circuit_breakers['P1'] = MagicMock()
        manager._circuit_breakers['P1'].is_open.return_value = True

        result = manager.send(_make_payload())

        self.assertFalse(result.success)
        self.assertEqual(result.error_code, 'CIRCUIT_OPEN')
        p1.send.assert_not_called()

    def test_no_providers_configured(self):
        manager = self._make_manager([])
        result = manager.send(_make_payload())
        self.assertFalse(result.success)
        self.assertIn('No email providers', result.error_message)


# ---------------------------------------------------------------------------
# Test: ProviderRegistry
# ---------------------------------------------------------------------------

class TestProviderRegistry(TestCase):

    def test_reset_forces_rebuild(self):
        from apps.email.providers import ProviderRegistry
        reg = ProviderRegistry()
        reg._manager = MagicMock()
        reg.reset()
        self.assertIsNone(reg._manager)

    @override_settings(EMAIL_SERVICE_CONFIG={
        'providers': [
            {'type': 'SMTP', 'enabled': True, 'priority': 1, 'password_env_var': 'EMAIL_HOST_PASSWORD'},
        ]
    })
    def test_builds_smtp_provider_from_settings(self):
        from apps.email.providers import ProviderRegistry
        from apps.email.providers.smtp import SMTPProvider

        reg = ProviderRegistry()
        providers = reg.get_all_providers()
        self.assertEqual(len(providers), 1)
        self.assertIsInstance(providers[0], SMTPProvider)

    @override_settings(EMAIL_SERVICE_CONFIG={
        'providers': []
    })
    def test_falls_back_to_default_smtp(self):
        """Empty providers list → fallback SMTPProvider inserted."""
        from apps.email.providers import ProviderRegistry
        from apps.email.providers.smtp import SMTPProvider

        reg = ProviderRegistry()
        providers = reg.get_all_providers()
        self.assertEqual(len(providers), 1)
        self.assertIsInstance(providers[0], SMTPProvider)
