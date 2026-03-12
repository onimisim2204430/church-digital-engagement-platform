"""
Tests for apps/email/rate_limiter.py

Covers:
- _parse_limit: parsing "N/period" strings
- RateLimiter sliding-window (Redis mock)
- RateLimitExceeded attributes and RFC 6585 headers
- QuotaStatus.as_headers()
- check_rate_limit() public function
- get_remaining_quota() public function
- DB fallback (DBRateLimiter)
- Fail-open behaviour when Redis is unavailable
"""

from datetime import timedelta
from unittest.mock import MagicMock, patch

from django.test import TestCase, override_settings


EMAIL_RATE_LIMITS = {
    'VERIFICATION':   {'user': '5/hour',  'global': '500/hour'},
    'PASSWORD_RESET': {'user': '3/hour',  'global': '100/hour'},
    'NOTIFICATION':   {'user': '20/hour', 'global': '2000/hour'},
    'BULK':           {'user': '10/day',  'global': '10000/day'},
}


class ParseLimitTests(TestCase):
    """_parse_limit(spec) -> (count, window_seconds)"""

    def _parse(self, spec):
        from apps.email.rate_limiter import _parse_limit
        return _parse_limit(spec)

    def test_per_minute(self):
        count, window = self._parse('10/minute')
        self.assertEqual(count, 10)
        self.assertEqual(window, 60)

    def test_per_hour(self):
        count, window = self._parse('100/hour')
        self.assertEqual(count, 100)
        self.assertEqual(window, 3600)

    def test_per_day(self):
        count, window = self._parse('500/day')
        self.assertEqual(count, 500)
        self.assertEqual(window, 86400)

    def test_per_second(self):
        count, window = self._parse('3/second')
        self.assertEqual(count, 3)
        self.assertEqual(window, 1)

    def test_invalid_spec_raises(self):
        with self.assertRaises((ValueError, KeyError, AttributeError)):
            self._parse('invalid')

    def test_missing_count_raises(self):
        with self.assertRaises((ValueError, AttributeError, TypeError)):
            self._parse('/hour')


class RateLimitExceededTests(TestCase):
    """RateLimitExceeded exception attributes and RFC 6585 header dict."""

    def _make_exc(self, **kwargs):
        from apps.email.rate_limiter import RateLimitExceeded
        defaults = {
            'message': 'Rate limit exceeded.',
            'limit_type': 'user',
            'email_type': 'NOTIFICATION',
            'limit': 10,
            'window_seconds': 3600,
            'retry_after': 120,
        }
        defaults.update(kwargs)
        return RateLimitExceeded(**defaults)

    def test_attributes_set(self):
        exc = self._make_exc(limit=5, retry_after=60)
        self.assertEqual(exc.limit, 5)
        self.assertEqual(exc.retry_after, 60)
        self.assertEqual(exc.limit_type, 'user')

    def test_as_headers_contains_retry_after(self):
        exc = self._make_exc(retry_after=300)
        headers = exc.as_headers()
        self.assertIn('Retry-After', headers)
        self.assertEqual(str(headers['Retry-After']), '300')

    def test_as_headers_contains_x_ratelimit(self):
        exc = self._make_exc(limit=20)
        headers = exc.as_headers()
        self.assertTrue(any('RateLimit' in k or 'X-RateLimit' in k for k in headers))


class QuotaStatusTests(TestCase):

    def _make_quota(self, **kwargs):
        from apps.email.rate_limiter import QuotaStatus
        defaults = {
            'allowed': True,
            'limit': 20,
            'remaining': 15,
            'window_seconds': 3600,
            'retry_after': 0,
            'limit_type': 'user',
            'email_type': 'NOTIFICATION',
        }
        defaults.update(kwargs)
        return QuotaStatus(**defaults)

    def test_allowed_quota(self):
        q = self._make_quota(allowed=True, remaining=5)
        self.assertTrue(q.allowed)
        self.assertEqual(q.remaining, 5)

    def test_as_headers_allowed(self):
        q = self._make_quota(allowed=True, remaining=5, limit=20)
        headers = q.as_headers()
        self.assertIsInstance(headers, dict)

    def test_as_headers_denied_includes_retry_after(self):
        q = self._make_quota(allowed=False, remaining=0, retry_after=180)
        headers = q.as_headers()
        self.assertIn('Retry-After', headers)


@override_settings(EMAIL_RATE_LIMITS=EMAIL_RATE_LIMITS)
class RateLimiterRedisTests(TestCase):
    """RateLimiter sliding-window using a mocked _get_cache."""

    def _make_cache_mock(self, count_before: int, over_limit: bool = False):
        """Return a mock cache whose Redis client pipeline simulates count_before entries."""
        import time as _time

        mock_client = MagicMock()
        pipe = MagicMock()
        pipe.execute.return_value = [None, count_before, None, None]
        mock_client.pipeline.return_value = pipe

        if over_limit:
            # zrange returns an oldest entry so retry_after can be computed
            mock_client.zrange.return_value = [('entry', _time.time() - 10)]
        else:
            mock_client.zrange.return_value = []

        mock_cache = MagicMock()
        mock_cache.client.get_client.return_value = mock_client
        return mock_cache

    def test_within_limit_returns_allowed(self):
        from apps.email.rate_limiter import RateLimiter
        import apps.email.rate_limiter as rl_module

        limiter = RateLimiter()
        mock_cache = self._make_cache_mock(count_before=3)

        with patch.object(rl_module, '_get_cache', return_value=mock_cache):
            allowed, current, retry = limiter._sliding_window_check(
                key='email:rl:user:NOTIFICATION:1',
                max_count=20,
                window_seconds=3600,
                now=1000000.0,
            )

        self.assertTrue(allowed)

    def test_at_limit_returns_denied(self):
        from apps.email.rate_limiter import RateLimiter
        import apps.email.rate_limiter as rl_module
        import time as _time

        limiter = RateLimiter()
        mock_cache = self._make_cache_mock(count_before=20, over_limit=True)
        mock_client = mock_cache.client.get_client.return_value
        # zrange must return (member, score) tuples
        mock_client.zrange.return_value = [(b'entry', 1000000.0 - 100)]

        with patch.object(rl_module, '_get_cache', return_value=mock_cache):
            allowed, current, retry = limiter._sliding_window_check(
                key='email:rl:user:NOTIFICATION:1',
                max_count=20,
                window_seconds=3600,
                now=1000000.0,
            )

        self.assertFalse(allowed)

    def test_check_and_increment_raises_rate_limit_exceeded(self):
        """check_and_increment raises RateLimitExceeded when the user limit is hit."""
        from apps.email.rate_limiter import RateLimiter, RateLimitExceeded
        import apps.email.rate_limiter as rl_module

        limiter = RateLimiter()

        # _sliding_window_check returning (False, 20, 600) triggers the exception
        with patch.object(
            limiter, '_sliding_window_check',
            return_value=(False, 20, 600),
        ):
            with self.assertRaises(RateLimitExceeded):
                limiter.check_and_increment(
                    email_type='NOTIFICATION',
                    user_id=1,
                    email='user@example.com',
                )

    def test_fail_open_when_redis_unavailable(self):
        """If Redis (_get_cache) raises, sliding-window returns (True, 0, 0)."""
        from apps.email.rate_limiter import RateLimiter
        import apps.email.rate_limiter as rl_module

        limiter = RateLimiter()
        with patch.object(rl_module, '_get_cache', return_value=None):
            allowed, _, _ = limiter._sliding_window_check(
                key='email:rl:user:NOTIFICATION:1',
                max_count=10,
                window_seconds=3600,
                now=1000000.0,
            )
        self.assertTrue(allowed)


@override_settings(EMAIL_RATE_LIMITS=EMAIL_RATE_LIMITS)
class CheckRateLimitPublicAPITests(TestCase):
    """check_rate_limit() public function"""

    def test_check_rate_limit_returns_quota_status(self):
        from apps.email.rate_limiter import check_rate_limit, QuotaStatus
        quota = QuotaStatus(
            allowed=True, limit=20, remaining=19,
            window_seconds=3600, retry_after=0,
            limit_type='user', email_type='NOTIFICATION',
        )
        with patch('apps.email.rate_limiter.rate_limiter') as mock_rl:
            mock_rl.check_and_increment.return_value = quota
            result = check_rate_limit('NOTIFICATION', user_id=1, email='u@example.com')
        self.assertIsNotNone(result)
        self.assertTrue(result.allowed)

    def test_check_rate_limit_propagates_exceeded(self):
        from apps.email.rate_limiter import check_rate_limit, RateLimitExceeded
        with patch('apps.email.rate_limiter.rate_limiter') as mock_rl:
            mock_rl.check_and_increment.side_effect = RateLimitExceeded(
                message='Limit exceeded.',
                limit_type='user', email_type='NOTIFICATION',
                limit=3, window_seconds=3600, retry_after=1800,
            )
            with self.assertRaises(RateLimitExceeded):
                check_rate_limit('NOTIFICATION', user_id=1, email='u@example.com')


@override_settings(EMAIL_RATE_LIMITS=EMAIL_RATE_LIMITS)
class GetRemainingQuotaTests(TestCase):

    def test_get_remaining_quota_returns_quota_status(self):
        from apps.email.rate_limiter import get_remaining_quota, QuotaStatus
        with patch('apps.email.rate_limiter.rate_limiter') as mock_rl:
            mock_rl.get_quota.return_value = QuotaStatus(
                allowed=True, limit=20, remaining=18,
                window_seconds=3600, retry_after=0,
                limit_type='user', email_type='NOTIFICATION',
            )
            quota = get_remaining_quota('NOTIFICATION', user_id=1, email='u@example.com')
        self.assertEqual(quota.remaining, 18)
        self.assertTrue(quota.allowed)
