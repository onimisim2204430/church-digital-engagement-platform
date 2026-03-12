"""
ProviderManager — orchestrates multiple providers with circuit breaker,
exponential backoff, and Redis-backed health state tracking.

Circuit Breaker State Machine
------------------------------
CLOSED  →  Normal operation; requests pass through.
OPEN    →  Provider is degraded; requests fail fast for `degraded_timeout` seconds.
HALF-OPEN → After timeout, one probe is allowed through to test recovery.

Failure counting is stored in Redis (fast) with a DB fallback (durable).
Health-check results are cached to avoid per-email overhead.

Redis Key Conventions (all prefixed with `email:cb:`):
    email:cb:<provider>:failures     — rolling failure count (INCR + EXPIRE)
    email:cb:<provider>:open_until   — Unix timestamp when circuit unblocks
    email:cb:<provider>:healthy      — bool flag cached after health check

Exponential Backoff (for the ProviderManager.send_with_retry caller):
    Attempt 1 : 1s  (handled by Celery; this class just sends)
    Attempt 2 : 2s
    Attempt 3 : 4s
    Attempt 4 : 8s
    Attempt 5 : 16s  → max_retries task-level cap
"""

import logging
import time
from typing import List, Optional, Tuple

from django.utils import timezone

from .base import AbstractEmailProvider, EmailPayload, ProviderResult
from .exceptions import (
    ProviderError,
    ProviderRateLimitError,
    ProviderTemporaryFailureError,
)

logger = logging.getLogger('email.providers.manager')

# ---------------------------------------------------------------------------
# Redis helpers  (imported lazily so the module loads without Django setup)
# ---------------------------------------------------------------------------

def _get_cache():
    """Return the default Django cache (Redis) or None."""
    try:
        from django.core.cache import cache
        return cache
    except Exception:
        return None

# ---------------------------------------------------------------------------
# Circuit breaker settings (overridden by EMAIL_SERVICE_CONFIG in settings)
# ---------------------------------------------------------------------------

_DEFAULT_FAILURE_THRESHOLD = 5      # trips circuit after N failures
_DEFAULT_DEGRADED_TIMEOUT = 300     # seconds circuit stays OPEN (5 min)
_DEFAULT_HEALTH_CACHE_TTL = 300     # seconds to cache a health-check result
_CB_KEY_PREFIX = 'email:cb:'


class CircuitBreaker:
    """
    Per-provider circuit breaker backed by Redis.

    Thread-safe because all state mutations go through atomic Redis commands
    (INCR with EXPIRE, SET with EX/NX).  DB fallback writes to
    EmailProviderConfig.circuit_open / .degraded_until for durability.
    """

    def __init__(
        self,
        provider_name: str,
        failure_threshold: int = _DEFAULT_FAILURE_THRESHOLD,
        degraded_timeout: int = _DEFAULT_DEGRADED_TIMEOUT,
    ) -> None:
        self.provider_name = provider_name
        self.failure_threshold = failure_threshold
        self.degraded_timeout = degraded_timeout
        self._failures_key = f'{_CB_KEY_PREFIX}{provider_name}:failures'
        self._open_until_key = f'{_CB_KEY_PREFIX}{provider_name}:open_until'

    # ------------------------------------------------------------------
    # State queries
    # ------------------------------------------------------------------

    def is_open(self) -> bool:
        """True = circuit is OPEN; requests should be rejected fast."""
        cache = _get_cache()
        if cache is None:
            return False  # No Redis → circuit always closed (degrade gracefully)

        open_until = cache.get(self._open_until_key)
        if open_until is None:
            return False

        if time.time() < float(open_until):
            return True

        # Timeout elapsed → transition to HALF-OPEN (allow one probe)
        cache.delete(self._open_until_key)
        return False

    def failure_count(self) -> int:
        cache = _get_cache()
        if cache is None:
            return 0
        return int(cache.get(self._failures_key) or 0)

    # ------------------------------------------------------------------
    # State mutations
    # ------------------------------------------------------------------

    def record_success(self) -> None:
        """Reset failure counter; close circuit."""
        cache = _get_cache()
        if cache is None:
            return
        cache.delete(self._failures_key)
        cache.delete(self._open_until_key)
        self._update_db_state(circuit_open=False)
        logger.debug('CircuitBreaker[%s]: success — circuit closed', self.provider_name)

    def record_failure(self) -> None:
        """
        Increment failure count.  Trip the circuit if threshold is reached.
        The failure window is `degraded_timeout` seconds (resets on trip).
        """
        cache = _get_cache()
        if cache is None:
            return

        # add() only sets the key if it does not already exist (atomic no-op otherwise)
        cache.add(self._failures_key, 0, timeout=self.degraded_timeout)
        count = cache.incr(self._failures_key)

        logger.debug(
            'CircuitBreaker[%s]: failure count=%d (threshold=%d)',
            self.provider_name,
            count,
            self.failure_threshold,
        )

        if count >= self.failure_threshold:
            self._trip()

    def _trip(self) -> None:
        """Open the circuit for `degraded_timeout` seconds."""
        cache = _get_cache()
        open_until = time.time() + self.degraded_timeout
        if cache:
            cache.set(self._open_until_key, open_until, timeout=self.degraded_timeout + 10)
            cache.delete(self._failures_key)  # Reset counter for next window
        self._update_db_state(circuit_open=True)
        logger.warning(
            'CircuitBreaker[%s]: TRIPPED — circuit OPEN for %ds',
            self.provider_name,
            self.degraded_timeout,
        )

    def _update_db_state(self, circuit_open: bool) -> None:
        """Persist circuit state to DB (EmailProviderConfig) for durability."""
        try:
            from apps.email.models import EmailProviderConfig
            EmailProviderConfig.objects.filter(
                name__icontains=self.provider_name
            ).update(
                circuit_open=circuit_open,
                degraded_until=timezone.now() if circuit_open else None,
            )
        except Exception as exc:
            logger.debug('CB DB update skipped: %s', exc)


# ---------------------------------------------------------------------------
# HealthCache  — avoids calling health_check() on every email send
# ---------------------------------------------------------------------------

class HealthCache:
    """Caches health-check results in Redis for `ttl` seconds."""

    def __init__(self, ttl: int = _DEFAULT_HEALTH_CACHE_TTL) -> None:
        self.ttl = ttl

    def _key(self, provider_name: str) -> str:
        return f'{_CB_KEY_PREFIX}{provider_name}:healthy'

    def get(self, provider_name: str) -> Optional[bool]:
        """Return cached health value or None if not cached."""
        cache = _get_cache()
        if cache is None:
            return None
        val = cache.get(self._key(provider_name))
        if val is None:
            return None
        return bool(val)

    def set(self, provider_name: str, healthy: bool) -> None:
        cache = _get_cache()
        if cache:
            cache.set(self._key(provider_name), int(healthy), timeout=self.ttl)

    def invalidate(self, provider_name: str) -> None:
        cache = _get_cache()
        if cache:
            cache.delete(self._key(provider_name))


# ---------------------------------------------------------------------------
# Metrics  — lightweight counters in Redis + DB
# ---------------------------------------------------------------------------

class ProviderMetrics:
    """Records success/failure counts per provider in Redis and the DB."""

    def record_success(self, provider_name: str, email_type: str = '') -> None:
        self._incr_redis(provider_name, 'success')
        self._update_db(provider_name, success=True)

    def record_failure(self, provider_name: str, error_code: str = '', email_type: str = '') -> None:
        self._incr_redis(provider_name, 'failure')
        self._update_db(provider_name, success=False)
        logger.debug('Metrics: %s failure [%s]', provider_name, error_code)

    def _incr_redis(self, provider_name: str, metric: str) -> None:
        cache = _get_cache()
        if cache is None:
            return
        key = f'email:metrics:{provider_name}:{metric}'
        # add() only sets the key when absent; incr() increments atomically
        cache.add(key, 0, timeout=90000)
        cache.incr(key)

    def _update_db(self, provider_name: str, success: bool) -> None:
        try:
            from django.db.models import F
            from apps.email.models import EmailProviderConfig
            now = timezone.now()
            if success:
                EmailProviderConfig.objects.filter(
                    name__icontains=provider_name
                ).update(
                    success_count=F('success_count') + 1,
                    last_success=now,
                )
            else:
                EmailProviderConfig.objects.filter(
                    name__icontains=provider_name
                ).update(
                    failure_count=F('failure_count') + 1,
                    last_failure=now,
                )
        except Exception:
            pass  # Never let metrics writes break the send path


# ---------------------------------------------------------------------------
# ProviderManager
# ---------------------------------------------------------------------------

_health_cache = HealthCache()
_metrics = ProviderMetrics()


class ProviderManager:
    """
    Orchestrates multiple AbstractEmailProvider instances.

    Per-send workflow:
    1. Filter OPEN (degraded) providers.
    2. Try providers in priority order.
    3. On success: record success, update circuit breaker, return.
    4. On failure: record failure, update circuit breaker, try next provider.
    5. All failed: return last ProviderResult with success=False.

    Provider selection for email types:
    - BULK email: prefer providers explicitly tagged bulk_capable=True
    - Everything else: use standard priority order
    """

    def __init__(
        self,
        providers: List[AbstractEmailProvider],
        failure_threshold: int = _DEFAULT_FAILURE_THRESHOLD,
        degraded_timeout: int = _DEFAULT_DEGRADED_TIMEOUT,
        health_cache_ttl: int = _DEFAULT_HEALTH_CACHE_TTL,
    ) -> None:
        self._providers = providers
        self._circuit_breakers = {
            p.__class__.__name__: CircuitBreaker(
                p.__class__.__name__, failure_threshold, degraded_timeout
            )
            for p in providers
        }
        self._health_cache = HealthCache(ttl=health_cache_ttl)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def send(self, payload: EmailPayload, email_type: str = '') -> ProviderResult:
        """
        Deliver `payload` using the first healthy, non-tripped provider.
        Falls back to the next provider on any failure.

        All provider switches are logged with the reason.
        """
        ordered = self._select_providers(email_type)

        if not ordered:
            return ProviderResult(
                success=False,
                provider_name='none',
                error_message='No email providers are available.',
            )

        last_result: Optional[ProviderResult] = None

        for provider in ordered:
            pname = provider.__class__.__name__
            cb = self._circuit_breakers.get(pname)

            # Circuit open? Skip without calling the provider
            if cb and cb.is_open():
                logger.warning(
                    'ProviderManager: skipping %s (circuit OPEN) for <%s>',
                    pname,
                    payload.to_email,
                )
                last_result = ProviderResult(
                    success=False,
                    provider_name=pname,
                    error_message='Circuit breaker is open.',
                    error_code='CIRCUIT_OPEN',
                )
                continue

            # Try this provider
            logger.debug('ProviderManager: trying %s for <%s>', pname, payload.to_email)
            result = provider.send(payload)

            if result.success:
                if cb:
                    cb.record_success()
                _metrics.record_success(pname, email_type)
                self._health_cache.set(pname, True)
                return result

            # Failure path
            if cb:
                cb.record_failure()
            _metrics.record_failure(
                pname,
                error_code=result.error_code,
                email_type=email_type,
            )
            # Invalidate cached health so next check is fresh
            self._health_cache.invalidate(pname)

            logger.warning(
                'ProviderManager: %s failed for <%s> [%s] — trying next provider',
                pname,
                payload.to_email,
                result.error_code or result.error_message[:80],
            )
            last_result = result

        # All providers failed
        logger.error(
            'ProviderManager: all providers failed for <%s>. Last error: %s',
            payload.to_email,
            last_result.error_message if last_result else 'unknown',
        )
        return last_result or ProviderResult(
            success=False,
            provider_name='none',
            error_message='All providers failed.',
        )

    def run_health_checks(self) -> List[Tuple[str, bool]]:
        """
        Run health_check() on every provider and update the cache.
        Called by the Celery beat task every 5 minutes.

        Returns a list of (provider_name, is_healthy) tuples.
        """
        results = []
        for provider in self._providers:
            pname = provider.__class__.__name__
            try:
                healthy = provider.health_check()
            except Exception as exc:
                logger.error('Health check exception for %s: %s', pname, exc)
                healthy = False

            self._health_cache.set(pname, healthy)

            cb = self._circuit_breakers.get(pname)
            if healthy and cb:
                cb.record_success()
            elif not healthy and cb:
                cb.record_failure()

            status = 'healthy' if healthy else 'UNHEALTHY'
            logger.info('Provider health check: %s → %s', pname, status)
            results.append((pname, healthy))

        return results

    def get_status(self) -> List[dict]:
        """
        Return a status dict for every provider (for the management command).
        """
        status_list = []
        for provider in self._providers:
            pname = provider.__class__.__name__
            cb = self._circuit_breakers.get(pname)
            cached_healthy = self._health_cache.get(pname)

            status_list.append({
                'provider': pname,
                'circuit_open': cb.is_open() if cb else False,
                'failure_count': cb.failure_count() if cb else 0,
                'cached_healthy': cached_healthy,
            })
        return status_list

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _select_providers(self, email_type: str) -> List[AbstractEmailProvider]:
        """
        Return providers ordered for delivery of the given email_type.

        BULK emails prefer SendGrid (better deliverability at volume).
        All other types use the standard priority order defined in settings.
        """
        from apps.email.constants import EmailType

        if email_type == EmailType.BULK:
            # Put SendGrid-type providers first for bulk
            bulk_first = [p for p in self._providers if 'sendgrid' in p.__class__.__name__.lower()]
            others = [p for p in self._providers if p not in bulk_first]
            return bulk_first + others

        return list(self._providers)
