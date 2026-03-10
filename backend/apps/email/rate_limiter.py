"""
Redis-based sliding window rate limiter for the email service.

Design
------
Two levels of enforcement run for every send attempt:

    1. Per-user  (or per-email for anonymous)  limit per email type
    2. Global    limit per email type

Both use Redis sorted-sets for O(log N) sliding window counting.
The DB model ``EmailRateLimit`` is written as a durable audit record and
used as a fallback when Redis is unavailable (best-effort, not strict).

Window format in settings.EMAIL_RATE_LIMITS
-------------------------------------------
    'PASSWORD_RESET': {
        'user':   '3/hour',   # 3 sends per user per hour
        'global': '100/hour', # 100 sends total per hour
    }
Recognised unit tokens: second, minute, hour, day
Short forms: s, m, h, d

Thread / process safety
-----------------------
Redis sorted-set operations + EXPIREAT are issued in a single pipeline,
making them effectively atomic from the Redis server's perspective.

Circuit-breaker for Redis unavailability
-----------------------------------------
If Redis is unreachable, all limiter methods log a warning and return
'allowed' rather than breaking the send path.
"""

import logging
import time
from dataclasses import dataclass
from typing import Optional, Tuple

from django.conf import settings

logger = logging.getLogger('email.rate_limiter')

# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class RateLimitExceeded(Exception):
    """
    Raised when a rate limit is exceeded.

    Attributes:
        limit_type:  'user' | 'global'
        email_type:  EmailType constant string
        limit:       configured maximum in the window
        window_seconds:  length of the window in seconds
        retry_after: seconds until the oldest request expires from the window
    """

    def __init__(
        self,
        message: str,
        limit_type: str = 'user',
        email_type: str = '',
        limit: int = 0,
        window_seconds: int = 3600,
        retry_after: int = 0,
    ):
        super().__init__(message)
        self.limit_type = limit_type
        self.email_type = email_type
        self.limit = limit
        self.window_seconds = window_seconds
        self.retry_after = retry_after  # seconds

    def as_headers(self) -> dict:
        """RFC 6585 rate-limit response headers."""
        return {
            'X-RateLimit-Limit': str(self.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': str(int(time.time()) + self.retry_after),
            'Retry-After': str(self.retry_after),
        }


# ---------------------------------------------------------------------------
# Window parsing
# ---------------------------------------------------------------------------

_UNIT_SECONDS = {
    'second': 1, 's': 1,
    'minute': 60, 'm': 60,
    'hour': 3600, 'h': 3600,
    'day': 86400, 'd': 86400,
}


def _parse_limit(spec: str) -> Tuple[int, int]:
    """
    Parse a rate limit specification string into (max_count, window_seconds).

    Examples:
        '3/hour'   → (3, 3600)
        '100/day'  → (100, 86400)
        '5/minute' → (5, 60)

    Raises:
        ValueError on unrecognised format.
    """
    try:
        count_str, unit = spec.strip().split('/', 1)
        count = int(count_str.strip())
        unit = unit.strip().lower()
        window = _UNIT_SECONDS[unit]
        if count <= 0:
            raise ValueError('Count must be positive.')
        return count, window
    except (ValueError, KeyError) as exc:
        raise ValueError(
            f'Invalid rate limit spec {spec!r}. '
            f'Expected format: "<count>/<unit>" e.g. "3/hour".'
        ) from exc


# ---------------------------------------------------------------------------
# Redis cache accessor
# ---------------------------------------------------------------------------

def _get_cache():
    """Return the Django cache backend, or None if unavailable."""
    try:
        from django.core.cache import cache
        return cache
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Rate limit configuration loader
# ---------------------------------------------------------------------------

_DEFAULT_LIMITS = {
    'VERIFICATION':    {'user': '5/hour',   'global': '500/hour'},
    'PASSWORD_RESET':  {'user': '3/hour',   'global': '100/hour'},
    'SECURITY_ALERT':  {'user': '10/hour',  'global': '1000/hour'},
    'TRANSACTIONAL':   {'user': '50/hour',  'global': '5000/hour'},
    'NOTIFICATION':    {'user': '20/hour',  'global': '2000/hour'},
    'BULK':            {'user': '10/day',   'global': '10000/hour'},
}


def _get_limits(email_type: str) -> dict:
    """
    Return the effective limits for an email type.

    Merges defaults with settings.EMAIL_RATE_LIMITS overrides.
    Returns a dict with 'user' and 'global' rate limit spec strings.
    """
    configured = getattr(settings, 'EMAIL_RATE_LIMITS', {})
    defaults = _DEFAULT_LIMITS.get(email_type, {'user': '50/hour', 'global': '1000/hour'})
    overrides = configured.get(email_type, {})
    return {**defaults, **overrides}


# ---------------------------------------------------------------------------
# Core RateLimiter
# ---------------------------------------------------------------------------

@dataclass
class QuotaStatus:
    """Result returned by ``RateLimiter.get_quota``."""
    allowed: bool
    limit: int
    remaining: int
    window_seconds: int
    retry_after: int          # seconds; 0 when allowed
    limit_type: str           # 'user' | 'global'
    email_type: str

    def as_headers(self) -> dict:
        """RFC 6585 response headers (always returned, even when allowed)."""
        reset_ts = int(time.time()) + self.retry_after
        headers = {
            'X-RateLimit-Limit': str(self.limit),
            'X-RateLimit-Remaining': str(max(self.remaining, 0)),
            'X-RateLimit-Reset': str(reset_ts),
        }
        if not self.allowed:
            headers['Retry-After'] = str(self.retry_after)
        return headers


class RateLimiter:
    """
    Sliding window rate limiter using Redis sorted sets.

    Redis key format:
        email:rl:user:<email_type>:<identifier>   — per-user window
        email:rl:global:<email_type>              — global window

    Each member of the sorted set is "<timestamp>:<uuid>" (unique per call);
    the score is the Unix timestamp.  Trimming the set to ``now - window``
    implements the sliding window.
    """

    _KEY_PREFIX = 'email:rl:'

    def check_and_increment(
        self,
        email_type: str,
        user_id: Optional[int] = None,
        email: str = '',
    ) -> QuotaStatus:
        """
        Atomically check the rate limit and, if allowed, consume one slot.

        This is the primary method called before accepting an outgoing email.

        Args:
            email_type: EmailType constant string.
            user_id:    Authenticated user's PK (or None for anonymous).
            email:      Recipient email used as identifier when user_id is None.

        Returns:
            QuotaStatus — call .allowed to check whether the email should proceed.

        Raises:
            RateLimitExceeded (subclass of Exception) — you may catch or let
            this propagate up to the service layer.
        """
        limits = _get_limits(email_type)
        identifier = str(user_id) if user_id else (email.lower() or 'anon')
        now = time.time()

        # --- Per-user check ---
        user_spec = limits.get('user', '50/hour')
        user_max, user_window = _parse_limit(user_spec)
        user_ok, user_count, user_retry = self._sliding_window_check(
            key=f'{self._KEY_PREFIX}user:{email_type}:{identifier}',
            max_count=user_max,
            window_seconds=user_window,
            now=now,
        )
        if not user_ok:
            self._increment_metric(email_type, 'user_exceeded')
            raise RateLimitExceeded(
                f'User rate limit exceeded for {email_type} '
                f'({user_max}/{user_window}s)',
                limit_type='user',
                email_type=email_type,
                limit=user_max,
                window_seconds=user_window,
                retry_after=user_retry,
            )

        # --- Global check ---
        global_spec = limits.get('global', '1000/hour')
        global_max, global_window = _parse_limit(global_spec)
        global_ok, global_count, global_retry = self._sliding_window_check(
            key=f'{self._KEY_PREFIX}global:{email_type}',
            max_count=global_max,
            window_seconds=global_window,
            now=now,
        )
        if not global_ok:
            self._increment_metric(email_type, 'global_exceeded')
            raise RateLimitExceeded(
                f'Global rate limit exceeded for {email_type} '
                f'({global_max}/{global_window}s)',
                limit_type='global',
                email_type=email_type,
                limit=global_max,
                window_seconds=global_window,
                retry_after=global_retry,
            )

        return QuotaStatus(
            allowed=True,
            limit=user_max,
            remaining=max(0, user_max - user_count),
            window_seconds=user_window,
            retry_after=0,
            limit_type='user',
            email_type=email_type,
        )

    def get_quota(
        self,
        email_type: str,
        user_id: Optional[int] = None,
        email: str = '',
    ) -> QuotaStatus:
        """
        Read the current quota status without incrementing the counter.

        Use this to decorate API responses with rate-limit headers.
        """
        limits = _get_limits(email_type)
        identifier = str(user_id) if user_id else (email.lower() or 'anon')
        now = time.time()

        user_spec = limits.get('user', '50/hour')
        user_max, user_window = _parse_limit(user_spec)
        user_ok, user_count, user_retry = self._sliding_window_peek(
            key=f'{self._KEY_PREFIX}user:{email_type}:{identifier}',
            max_count=user_max,
            window_seconds=user_window,
            now=now,
        )

        return QuotaStatus(
            allowed=user_ok,
            limit=user_max,
            remaining=max(0, user_max - user_count),
            window_seconds=user_window,
            retry_after=user_retry,
            limit_type='user',
            email_type=email_type,
        )

    def reset(self, email_type: str, user_id: Optional[int] = None, email: str = '') -> None:
        """
        Clear the rate limit window for a specific user/type.

        Useful in tests and for admin override.
        """
        cache = _get_cache()
        if cache is None:
            return
        identifier = str(user_id) if user_id else (email.lower() or 'anon')
        key = f'{self._KEY_PREFIX}user:{email_type}:{identifier}'
        cache.delete(key)

    # ------------------------------------------------------------------
    # Internal sliding window helpers
    # ------------------------------------------------------------------

    def _sliding_window_check(
        self,
        key: str,
        max_count: int,
        window_seconds: int,
        now: float,
    ) -> Tuple[bool, int, int]:
        """
        Read–prune–count–add in a Redis pipeline.

        Returns:
            (allowed: bool, current_count: int, retry_after_seconds: int)
        """
        cache = _get_cache()
        if cache is None:
            # Redis unavailable — allow the send (fail-open policy)
            logger.warning('RateLimiter: Redis unavailable, allowing send (fail-open).')
            return True, 0, 0

        window_start = now - window_seconds

        try:
            # Use the low-level Redis client for sorted-set operations
            client = cache.client.get_client(write=True)

            pipe = client.pipeline(transaction=True)
            # 1. Remove entries older than the window
            pipe.zremrangebyscore(key, '-inf', window_start)
            # 2. Count entries still in the window
            pipe.zcard(key)
            # 3. Add the new entry (score = now, member = unique string)
            import uuid as _uuid
            entry = f'{now}:{_uuid.uuid4().hex}'
            pipe.zadd(key, {entry: now})
            # 4. Set expiry so the key is cleaned up automatically
            pipe.expireat(key, int(now) + window_seconds + 10)
            results = pipe.execute()

            count_before = results[1]  # Count *before* adding the new entry

            if count_before >= max_count:
                # Undo the zadd — we're over the limit
                client.zrem(key, entry)
                # Calculate retry_after: when does the oldest entry expire?
                oldest_scores = client.zrange(key, 0, 0, withscores=True)
                if oldest_scores:
                    oldest_ts = oldest_scores[0][1]
                    retry_after = max(1, int(oldest_ts + window_seconds - now))
                else:
                    retry_after = window_seconds
                return False, count_before, retry_after

            return True, count_before + 1, 0

        except Exception as exc:
            logger.warning(
                'RateLimiter._sliding_window_check failed for key %s: %s — allowing (fail-open)',
                key,
                exc,
            )
            return True, 0, 0

    def _sliding_window_peek(
        self,
        key: str,
        max_count: int,
        window_seconds: int,
        now: float,
    ) -> Tuple[bool, int, int]:
        """Read-only version of the sliding window (no add)."""
        cache = _get_cache()
        if cache is None:
            return True, 0, 0

        window_start = now - window_seconds

        try:
            client = cache.client.get_client(write=False)
            pipe = client.pipeline(transaction=False)
            pipe.zremrangebyscore(key, '-inf', window_start)
            pipe.zcard(key)
            results = pipe.execute()

            count = results[1]
            allowed = count < max_count
            retry_after = 0

            if not allowed:
                oldest_scores = client.zrange(key, 0, 0, withscores=True)
                if oldest_scores:
                    oldest_ts = oldest_scores[0][1]
                    retry_after = max(1, int(oldest_ts + window_seconds - now))
                else:
                    retry_after = window_seconds

            return allowed, count, retry_after

        except Exception as exc:
            logger.warning('RateLimiter._sliding_window_peek failed: %s — reporting allowed', exc)
            return True, 0, 0

    def _increment_metric(self, email_type: str, metric: str) -> None:
        """Silently increment a monitoring counter in Redis."""
        try:
            cache = _get_cache()
            if cache is None:
                return
            key = f'email:rl:metrics:{email_type}:{metric}'
            cache.add(key, 0, timeout=90000)
            cache.incr(key)
        except Exception:
            pass


# ---------------------------------------------------------------------------
# DB fallback (used when Redis is unavailable)
# ---------------------------------------------------------------------------

class DBRateLimiter:
    """
    Database-backed rate limiter used as a fallback.

    Atomically increments the EmailRateLimit counter using Django's F().
    Less precise than the Redis limiter (no sliding window — uses fixed windows)
    but safe with concurrent workers.
    """

    def check_and_increment(
        self,
        email_type: str,
        user_id: Optional[int] = None,
        email: str = '',
    ) -> QuotaStatus:
        from django.db.models import F
        from django.utils import timezone
        from datetime import timedelta, datetime

        from .models import EmailRateLimit

        limits = _get_limits(email_type)
        user_spec = limits.get('user', '50/hour')
        max_count, window_seconds = _parse_limit(user_spec)
        now = timezone.now()
        window_start = now - timedelta(seconds=window_seconds)

        # Attempt to find an active window for this user/email
        qs = EmailRateLimit.objects.filter(
            email_type=email_type,
            window_start__gte=window_start,
        )

        if user_id:
            qs = qs.filter(user_id=user_id)
        else:
            qs = qs.filter(email__iexact=email)

        rl = qs.order_by('-window_start').first()

        if rl is None:
            # First send in this window — create a new row
            rl = EmailRateLimit.objects.create(
                user_id=user_id,
                email=email or '',
                email_type=email_type,
                count=1,
                window_start=now,
                window_seconds=window_seconds,
            )
            current = 1
        else:
            EmailRateLimit.objects.filter(pk=rl.pk).update(count=F('count') + 1)
            rl.refresh_from_db(fields=['count'])
            current = rl.count

        allowed = current <= max_count
        retry_after = 0
        if not allowed:
            expires = rl.window_start + timedelta(seconds=window_seconds)
            retry_after = max(0, int((expires - now).total_seconds()))

        return QuotaStatus(
            allowed=allowed,
            limit=max_count,
            remaining=max(0, max_count - current),
            window_seconds=window_seconds,
            retry_after=retry_after,
            limit_type='user',
            email_type=email_type,
        )


# ---------------------------------------------------------------------------
# Public singleton
# ---------------------------------------------------------------------------

rate_limiter = RateLimiter()
db_rate_limiter = DBRateLimiter()


def check_rate_limit(
    email_type: str,
    user_id: Optional[int] = None,
    email: str = '',
) -> QuotaStatus:
    """
    Top-level helper: check (and consume) one rate-limit slot.

    Tries Redis first, falls back to DB limiter if Redis fails entirely.

    Raises:
        RateLimitExceeded if the limit is exceeded.
    """
    try:
        return rate_limiter.check_and_increment(email_type, user_id, email)
    except RateLimitExceeded:
        raise   # Re-raise limit errors immediately
    except Exception as exc:
        logger.warning('Redis rate limiter failed, trying DB fallback: %s', exc)
        return db_rate_limiter.check_and_increment(email_type, user_id, email)


def get_remaining_quota(
    email_type: str,
    user_id: Optional[int] = None,
    email: str = '',
) -> QuotaStatus:
    """Read-only quota check (useful for preflight / API headers)."""
    return rate_limiter.get_quota(email_type, user_id, email)
