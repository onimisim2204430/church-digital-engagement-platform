"""
Template engine for the standalone email service.

Lookup order
------------
1. DB (EmailTemplate)  — slug + is_active + highest version
2. Filesystem           — ``apps/email/templates/emails/<slug>.html``

Both layers support Django template syntax: ``{{ variable }}``, ``{% if %}``,
``{% for %}``, custom filters, and template inheritance via ``{% extends %}``.

Caching
-------
Rendered *compiled* (Django Template object) are cached in Redis under the key:
    email_template:{slug}:{version}

Changing a template in the admin invalidates the cache via
``TemplateEngine.invalidate_cache(slug, version)``.

Security
--------
All user-supplied context values passed to ``render_template()`` are treated
as *potentially untrusted*.  The engine marks them as safe only after they have
passed through Django's auto-escaping.  Never call ``mark_safe()`` on raw user
input inside templates.

Usage
-----
    from apps.email.template_engine import TemplateEngine

    subject, html, text = TemplateEngine.render(
        template_slug='verification',
        context={'user': user, 'verification_url': url},
        email_type=EmailType.VERIFICATION,
    )
"""

import logging
from typing import Optional, Tuple

from django.conf import settings
from django.template import Context, Engine, Template, TemplateSyntaxError
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.utils import timezone

logger = logging.getLogger('email.template_engine')

_CACHE_KEY_PREFIX = 'email_template:'
_FALLBACK_SUBJECT = '(No subject)'


# ---------------------------------------------------------------------------
# Cache helpers
# ---------------------------------------------------------------------------

def _get_cache():
    try:
        from django.core.cache import cache
        return cache
    except Exception:
        return None


def _cache_ttl() -> int:
    return getattr(settings, 'EMAIL_TEMPLATE_CACHE_TIMEOUT', 300)


def _cache_key(slug: str, version: int) -> str:
    return f'{_CACHE_KEY_PREFIX}{slug}:{version}'


# ---------------------------------------------------------------------------
# HTML → plain-text conversion
# ---------------------------------------------------------------------------

def html_to_text(html: str) -> str:
    """
    Convert HTML to a readable plain-text string.

    Uses ``html2text`` if available (pip install html2text) for best results;
    otherwise falls back to Django's ``strip_tags``.
    """
    try:
        import html2text
        h = html2text.HTML2Text()
        h.ignore_links = False
        h.body_width = 76
        h.ignore_images = True
        h.protect_links = True
        h.wrap_links = False
        return h.handle(html).strip()
    except ImportError:
        return strip_tags(html).strip()


# ---------------------------------------------------------------------------
# Context builders
# ---------------------------------------------------------------------------

def _base_context(email: str = '', user=None) -> dict:
    """
    Build the standard context variables available in every email template.
    """
    from .utils import build_unsubscribe_url, build_tracking_pixel_url

    cfg = getattr(settings, 'EMAIL_SERVICE_CONFIG', {})
    site_url = cfg.get('tracking_base_url', '') or getattr(settings, 'SITE_URL', '')
    site_name = getattr(settings, 'SITE_NAME', 'Church Digital Platform')
    logo_url = getattr(settings, 'EMAIL_LOGO_URL', f'{site_url.rstrip("/")}/static/logo.png')

    ctx: dict = {
        'site_url': site_url.rstrip('/'),
        'site_name': site_name,
        'logo_url': logo_url,
        'current_year': timezone.now().year,
        'support_email': getattr(settings, 'SUPPORT_EMAIL', ''),
        'tracking_enabled': getattr(settings, 'EMAIL_TRACKING_ENABLED', True),
    }

    if email:
        ctx['unsubscribe_url'] = build_unsubscribe_url(email)
        ctx['recipient_email'] = email

    if user:
        ctx['user'] = user
        ctx['user_name'] = (
            getattr(user, 'get_full_name', lambda: '')()
            or getattr(user, 'username', '')
            or ''
        )

    return ctx


# ---------------------------------------------------------------------------
# DB template loader
# ---------------------------------------------------------------------------

def _load_from_db(slug: str, email_type: Optional[str] = None):
    """
    Load the active, highest-version EmailTemplate matching ``slug``.

    Returns the EmailTemplate ORM instance or None.
    """
    try:
        from .models import EmailTemplate
        qs = EmailTemplate.objects.filter(slug=slug, is_active=True)
        if email_type:
            qs = qs.filter(email_type=email_type)
        return qs.order_by('-version').first()
    except Exception as exc:
        logger.warning('TemplateEngine: DB lookup for slug=%r failed: %s', slug, exc)
        return None


# ---------------------------------------------------------------------------
# Template compilation
# ---------------------------------------------------------------------------

def _compile_template(html_body: str, slug: str) -> Template:
    """
    Compile a Django Template from an HTML string.

    Uses a custom Engine with autoescape=True (default) and our custom
    template libraries (if any) loaded.
    """
    engine = Engine.get_default()
    try:
        return engine.from_string(html_body)
    except TemplateSyntaxError as exc:
        logger.error('TemplateEngine: syntax error in template slug=%r: %s', slug, exc)
        raise


def _get_compiled(slug: str, version: int, html_body: str) -> Template:
    """
    Return a compiled Template, pulling from cache if available.
    Django Template objects are not picklable so we cache the *source*
    and recompile on cache miss.
    """
    cache = _get_cache()
    if cache is None:
        return _compile_template(html_body, slug)

    key = _cache_key(slug, version)
    source = cache.get(key)
    if source is None:
        # Prime the cache with the source text
        cache.set(key, html_body, timeout=_cache_ttl())
        source = html_body

    return _compile_template(source, slug)


# ---------------------------------------------------------------------------
# Main TemplateEngine
# ---------------------------------------------------------------------------

class TemplateEngine:
    """
    Public interface for email template rendering.

    All methods are class-methods.  There is no need to instantiate this.
    """

    # ------------------------------------------------------------------
    # Primary rendering entry point
    # ------------------------------------------------------------------

    @classmethod
    def render(
        cls,
        template_slug: str,
        context: dict,
        email_type: Optional[str] = None,
        user=None,
        email: str = '',
    ) -> Tuple[str, str, str]:
        """
        Render a template and return (subject, html_body, text_body).

        Lookup order:
            1. DB (active template with matching slug)
            2. Filesystem (apps/email/templates/emails/<slug>.html)

        Context augmentation:
            - All keys from ``_base_context()`` are injected.
            - Caller-supplied ``context`` values override defaults.

        Args:
            template_slug: Slug of the template (e.g. 'verification').
            context:       Dict of template variables.
            email_type:    Optional EmailType constant for namespace filtering.
            user:          Django User instance for context injection.
            email:         Recipient address for unsubscribe URL generation.

        Returns:
            (subject, html_body, text_body)

        Raises:
            TemplateNotFound if no template is found in DB or filesystem.
        """
        full_ctx = _base_context(email=email, user=user)
        full_ctx.update(context)

        template_obj = _load_from_db(template_slug, email_type)

        if template_obj is not None:
            return cls._render_db_template(template_obj, full_ctx)

        return cls._render_file_template(template_slug, full_ctx)

    @classmethod
    def render_subject_only(
        cls,
        template_slug: str,
        context: dict,
        email_type: Optional[str] = None,
    ) -> str:
        """
        Render just the subject line from the DB template.

        Returns a sensible default if no template is found.
        """
        template_obj = _load_from_db(template_slug, email_type)
        if template_obj is None:
            return _FALLBACK_SUBJECT

        base = _base_context()
        base.update(context)
        try:
            engine = Engine.get_default()
            t = engine.from_string(template_obj.subject)
            return t.render(Context(base, autoescape=True)).strip() or _FALLBACK_SUBJECT
        except Exception as exc:
            logger.warning('TemplateEngine: subject render failed for %r: %s', template_slug, exc)
            return template_obj.subject

    # ------------------------------------------------------------------
    # Preview API (admin-facing)
    # ------------------------------------------------------------------

    @classmethod
    def preview(
        cls,
        template_slug: str,
        email_type: Optional[str] = None,
        sample_user=None,
    ) -> Tuple[str, str, str]:
        """
        Render a template with a set of reasonable sample values.

        Returns (subject, html_body, text_body) suitable for admin preview.
        """
        sample = cls._sample_context(template_slug, email_type)
        return cls.render(
            template_slug=template_slug,
            context=sample,
            email_type=email_type,
            user=sample_user,
            email=sample.get('to_email', 'preview@example.com'),
        )

    # ------------------------------------------------------------------
    # Cache management
    # ------------------------------------------------------------------

    @classmethod
    def invalidate_cache(cls, slug: str, version: Optional[int] = None) -> None:
        """
        Evict template(s) from the cache.

        If ``version`` is None, this loads the current active version from DB
        and evicts that key.  Called by the admin after saving a template.
        """
        cache = _get_cache()
        if cache is None:
            return

        if version is not None:
            cache.delete(_cache_key(slug, version))
            logger.debug('TemplateEngine: cache invalidated for %s v%s', slug, version)
            return

        template_obj = _load_from_db(slug)
        if template_obj:
            cache.delete(_cache_key(slug, template_obj.version))

    @classmethod
    def warm_all(cls) -> int:
        """
        Pre-load all active templates into Redis cache.

        Returns the number of templates warmed.
        """
        from .models import EmailTemplate
        count = 0
        for tmpl in EmailTemplate.objects.filter(is_active=True).order_by('slug', '-version'):
            try:
                cache = _get_cache()
                if cache:
                    key = _cache_key(tmpl.slug, tmpl.version)
                    cache.set(key, tmpl.html_body, timeout=_cache_ttl())
                    count += 1
            except Exception as exc:
                logger.warning('TemplateEngine.warm_all: failed for %s: %s', tmpl.slug, exc)
        logger.info('TemplateEngine.warm_all: warmed %d templates', count)
        return count

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @classmethod
    def _render_db_template(
        cls,
        template_obj,
        context: dict,
    ) -> Tuple[str, str, str]:
        """Render an EmailTemplate instance (DB record → string outputs)."""
        # Subject
        try:
            engine = Engine.get_default()
            subject_t = engine.from_string(template_obj.subject)
            subject = subject_t.render(Context(context, autoescape=True)).strip()
        except Exception:
            subject = template_obj.subject

        # HTML body
        try:
            html_t = _get_compiled(template_obj.slug, template_obj.version, template_obj.html_body)
            html_body = html_t.render(Context(context, autoescape=True))
        except Exception as exc:
            logger.error('TemplateEngine: HTML render error for %r: %s', template_obj.slug, exc)
            raise

        # Text body — use stored text if available, else convert HTML
        if template_obj.text_body:
            try:
                engine = Engine.get_default()
                text_t = engine.from_string(template_obj.text_body)
                text_body = text_t.render(Context(context, autoescape=False))
            except Exception:
                text_body = html_to_text(html_body)
        else:
            text_body = html_to_text(html_body)

        # Bump template 'last_used' counter (non-blocking; fire-and-forget)
        cls._touch_template_async(template_obj.pk)

        return subject, html_body, text_body

    @classmethod
    def _render_file_template(
        cls,
        slug: str,
        context: dict,
    ) -> Tuple[str, str, str]:
        """
        Render from filesystem templates (``apps/email/templates/emails/``).

        Raises TemplateNotFound if neither ``<slug>.html`` nor ``<slug>.txt``
        exists on disk.
        """
        from django.template.exceptions import TemplateDoesNotExist

        subject = context.get('subject', _FALLBACK_SUBJECT)

        # HTML
        try:
            html_body = render_to_string(f'emails/{slug}.html', context)
        except TemplateDoesNotExist:
            html_body = ''
            logger.debug('TemplateEngine: no filesystem HTML template for slug=%r', slug)

        # Plain text
        try:
            text_body = render_to_string(f'emails/{slug}.txt', context)
        except TemplateDoesNotExist:
            text_body = html_to_text(html_body) if html_body else ''

        if not html_body and not text_body:
            raise TemplateNotFound(
                f'No template found for slug={slug!r} in DB or filesystem.'
            )

        return subject, html_body, text_body

    @classmethod
    def _touch_template_async(cls, template_pk) -> None:
        """Non-blocking update of last_used + usage_count."""
        try:
            from django.db.models import F
            from .models import EmailTemplate
            EmailTemplate.objects.filter(pk=template_pk).update(
                usage_count=F('usage_count') + 1,
                last_used=timezone.now(),
            )
        except Exception:
            pass  # Never let metrics writes interrupt the send path

    @classmethod
    def _sample_context(cls, slug: str, email_type: Optional[str]) -> dict:
        """Return a dict of sample values for admin preview."""
        common = {
            'to_email': 'preview@church.example',
            'user_name': 'James Okafor',
            'subject': f'[Preview] {slug.replace("_", " ").title()}',
        }

        extras = {
            'verification':     {'verification_url': 'https://church.example/verify/TOKEN'},
            'password_reset':   {'reset_url': 'https://church.example/reset/TOKEN', 'expires_hours': 24},
            'security_alert':   {'event': 'New sign-in from Chrome on Windows', 'ip_address': '192.0.2.1', 'location': 'Lagos, Nigeria'},
            'notification':     {'notification_title': 'Your prayer request was answered', 'notification_body': 'Someone responded to your prayer request.', 'action_url': 'https://church.example/prayer/1'},
            'transactional':    {'order_id': 'ORD-2026-0042', 'amount': '₦5,000', 'description': 'Tithe — March 2026'},
            'bulk':             {'headline': 'March Newsletter', 'preview_text': 'Latest updates from our church community'},
        }

        common.update(extras.get(slug, {}))
        return common


# ---------------------------------------------------------------------------
# Exception
# ---------------------------------------------------------------------------

class TemplateNotFound(Exception):
    """Raised when no template is found in DB or filesystem."""
