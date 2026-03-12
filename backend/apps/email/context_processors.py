"""
Email context processors.

Provides common variables to templates rendered by TemplateEngine
and to Django's regular request-based templates.

Usage in settings.py:
    TEMPLATES[0]['OPTIONS']['context_processors'] += [
        'apps.email.context_processors.email_context',
    ]
"""

from django.conf import settings
from django.utils import timezone


def email_context(request=None) -> dict:
    """
    Return a dict of variables available in every email (and optionally
    web) template.

    This function can be called:
    - As a Django template context processor (receives ``request``)
    - Directly by TemplateEngine._base_context() (no request needed)
    """
    cfg = getattr(settings, 'EMAIL_SERVICE_CONFIG', {})
    site_url = (
        cfg.get('tracking_base_url', '')
        or getattr(settings, 'SITE_URL', 'http://localhost:8000')
    ).rstrip('/')

    return {
        'site_url': site_url,
        'site_name': getattr(settings, 'SITE_NAME', 'Church Digital Platform'),
        'logo_url': getattr(
            settings, 'EMAIL_LOGO_URL',
            f'{site_url}/static/logo.png',
        ),
        'current_year': timezone.now().year,
        'support_email': getattr(settings, 'SUPPORT_EMAIL', ''),
        'tracking_enabled': getattr(settings, 'EMAIL_TRACKING_ENABLED', True),
    }
