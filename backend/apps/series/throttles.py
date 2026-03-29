"""
Series throttle classes for abuse prevention.
"""
import logging

from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle

logger = logging.getLogger('series')


class SeriesSubscriptionAnonThrottle(AnonRateThrottle):
    """
    Rate limit anonymous (public) subscription creation to 10 per hour per IP.
    Prevents verification-email flooding to arbitrary addresses.
    """
    scope = 'series_subscription_anon'
    THROTTLE_RATES = {'series_subscription_anon': '10/hour'}


class SeriesSubscriptionUserThrottle(SimpleRateThrottle):
    """
    Rate limit authenticated subscription creation to 30 per hour per user.
    Prevents bulk-subscribe botting by authenticated accounts.
    """
    scope = 'series_subscription_user'
    THROTTLE_RATES = {'series_subscription_user': '30/hour'}

    def get_cache_key(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return None
        return self.cache_format % {
            'scope': self.scope,
            'ident': str(request.user.pk),
        }


class SeriesAnnouncementRequestThrottle(SimpleRateThrottle):
    """
    Rate limit announcement-request creation per moderator per series.
    Limit: 5 requests per moderator per series per 24 hours.

    This prevents a moderator from hammering admins with approval requests
    for the same series. The cache key includes both the user and the series
    id so different series are independently throttled.
    """
    scope = 'series_announcement_request'
    # Configurable via settings: SERIES_ANNOUNCEMENT_REQUEST_RATE (default 5/day)
    rate = '5/day'

    def get_rate(self):
        from django.conf import settings
        return getattr(settings, 'SERIES_ANNOUNCEMENT_REQUEST_RATE', self.rate)

    def get_cache_key(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return None
        # Extract series from request data — supports both UUID and slug
        series_id = (
            request.data.get('series')
            or request.data.get('series_id')
            or 'unknown'
        )
        return self.cache_format % {
            'scope': self.scope,
            'ident': f'{request.user.pk}:{series_id}',
        }
