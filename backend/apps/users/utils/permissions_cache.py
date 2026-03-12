"""
Redis-backed cache helpers for moderator permissions.

Cache key: ``perms:{user_id}``
Value: JSON-serialised list of permission code strings
TTL: matches ACCESS_TOKEN_LIFETIME (default 3600 s / 60 min)

Why: every permission check hits ``HasModulePermission`` which calls
``get_cached_permissions()``.  Redis serves the full permissions list in
a single O(1) GET rather than a DB query per request.

Cache invalidation happens automatically via the ``post_save`` signal on
``ModeratorPermission`` (see models.py), and is also called explicitly
by the permission-update API endpoint.
"""

from __future__ import annotations

import json
import logging

from django.conf import settings

logger = logging.getLogger(__name__)

_redis_client = None


def _get_redis():
    """Return a lazily-initialised Redis client (singleton per worker)."""
    global _redis_client
    if _redis_client is None:
        import redis

        redis_url = getattr(settings, "REDIS_URL", "redis://127.0.0.1:6379/3")
        # Use db=3 for permissions cache — db=2 is already used by channels
        _redis_client = redis.Redis.from_url(redis_url, decode_responses=True)
    return _redis_client


def _cache_key(user_id: str) -> str:
    return f"perms:{user_id}"


def _ttl() -> int:
    """Return TTL in seconds equalising the JWT access token lifetime."""
    try:
        lifetime = settings.SIMPLE_JWT.get("ACCESS_TOKEN_LIFETIME")
        if lifetime is not None:
            return int(lifetime.total_seconds())
    except Exception:
        pass
    return 3600  # 60-minute default


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_cached_permissions(user_id: str) -> list[str]:
    """
    Return the list of permission codes for *user_id*.

    Order of resolution:
    1. Redis cache hit  → return immediately (no DB query)
    2. Redis cache miss → query ``ModeratorPermission``, populate cache, return
    3. No ``ModeratorPermission`` row (admin or non-moderator) → return ``[]``

    Never raises; on any Redis error it falls back directly to DB.
    """
    try:
        r = _get_redis()
        raw = r.get(_cache_key(user_id))
        if raw is not None:
            return json.loads(raw)
    except Exception as exc:
        logger.warning("Redis GET failed for perms:%s — %s", user_id, exc)

    # DB fallback
    try:
        from apps.users.models import ModeratorPermission

        mp = ModeratorPermission.objects.filter(user_id=user_id).first()
        perms: list[str] = mp.permissions if mp else []
    except Exception as exc:
        logger.error("DB fallback for perms:%s failed — %s", user_id, exc)
        perms = []

    # Best-effort: repopulate cache so next call is a hit
    try:
        set_cached_permissions(user_id, perms)
    except Exception:
        pass

    return perms


def set_cached_permissions(user_id: str, perms: list[str]) -> None:
    """
    Write *perms* to Redis with the standard TTL.

    Called:
    - After ``ModeratorPermission`` is created/updated (via signal re-population)
    - On first cache miss (in ``get_cached_permissions``)
    - By the admin permission-update endpoint to eagerly warm the cache
    """
    try:
        r = _get_redis()
        r.set(_cache_key(user_id), json.dumps(perms), ex=_ttl())
    except Exception as exc:
        logger.warning("Redis SET failed for perms:%s — %s", user_id, exc)


def invalidate_permissions_cache(user_id: str) -> None:
    """
    Delete the Redis entry for *user_id*.

    Called by the ``post_save`` signal on ``ModeratorPermission`` and
    explicitly by the permission-update view so stale tokens can't serve
    old cached permissions.
    """
    try:
        r = _get_redis()
        r.delete(_cache_key(user_id))
    except Exception as exc:
        logger.warning("Redis DEL failed for perms:%s — %s", user_id, exc)
