"""
EmailService — the single public entry point for all email sending.

Phase 3 upgrades:
- Template rendering via TemplateEngine (DB-first, filesystem fallback)
- Rate limiting via RateLimiter  (Redis sliding window, DB fallback)
- Attachment support (passed through to providers that accept them)
- CC / BCC / Reply-To header support
- Batch / bulk send helper  (send_bulk)
- Template-slug-based send: pass ``template_slug`` instead of ``subject``/``body_html``

All callers should migrate to ``template_slug`` where possible; the raw
``subject``/``body_html`` path is retained for backward compatibility and
for programmatic / framework-generated content.

Usage (preferred):
    from apps.email.services import EmailService
    from apps.email.constants import EmailType

    EmailService.send_email(
        to_email='user@example.com',
        template_slug='verification',
        context={'verification_url': url},
        email_type=EmailType.VERIFICATION,
        user=request.user,
    )

Usage (legacy / programmatic):
    EmailService.send_email(
        to_email='user@example.com',
        subject='Welcome!',
        body_html='<h1>Hello</h1>',
        email_type=EmailType.NOTIFICATION,
    )
"""

import logging
from typing import List, Optional

from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone

from .constants import EmailPriority, EmailStatus, EmailType
from .models import EmailMessage
from .providers import provider_registry
from .providers.base import EmailPayload

logger = logging.getLogger('email.service')

User = get_user_model()


class EmailServiceError(Exception):
    """Raised when EmailService cannot dispatch the email."""


class EmailService:
    """
    Facade that orchestrates:
    1. Template rendering   (Phase 3)
    2. Rate limit check     (Phase 3)
    3. EmailMessage record creation (audit trail)
    4. Unsubscribe pre-flight check
    5. Synchronous or asynchronous dispatch via provider registry

    All methods are class-methods so callers don't need to instantiate this.
    """

    # ------------------------------------------------------------------
    # Primary API
    # ------------------------------------------------------------------

    @classmethod
    def send_email(
        cls,
        to_email: str,
        # --- Template path (preferred) ---
        template_slug: Optional[str] = None,
        context: Optional[dict] = None,
        # --- Raw content path (legacy / programmatic) ---
        subject: str = '',
        body_html: str = '',
        body_text: str = '',
        # --- Addressing ---
        *,
        to_name: str = '',
        from_email: str = '',
        from_name: str = '',
        reply_to: str = '',
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        # --- Categorisation ---
        email_type: str = EmailType.NOTIFICATION,
        priority: str = EmailPriority.MEDIUM,
        # --- Attachments ---
        attachments: Optional[List[dict]] = None,
        # --- Relations ---
        user: Optional[User] = None,
        template=None,
        metadata: Optional[dict] = None,
        scheduled_at=None,
        # --- Dispatch mode ---
        async_send: bool = True,
        skip_rate_limit: bool = False,
    ) -> EmailMessage:
        """
        Create an EmailMessage record and dispatch it.

        Args:
            to_email:        Recipient email address.
            template_slug:   Slug of an EmailTemplate to render.  When given,
                             ``subject`` / ``body_html`` / ``body_text`` are
                             derived from the rendered template.
            context:         Template context variables (used with template_slug).
            subject:         Email subject line (used when template_slug is None).
            body_html:       Rendered HTML body (used when template_slug is None).
            body_text:       Plain-text fallback (auto-generated if omitted).
            to_name:         Recipient display name.
            from_email:      Sender address (falls back to DEFAULT_FROM_EMAIL).
            from_name:       Sender display name.
            reply_to:        Reply-To address.
            cc:              List of CC addresses.
            bcc:             List of BCC addresses.
            email_type:      EmailType constant.
            priority:        EmailPriority constant.
            attachments:     List of dicts:
                             [{'filename': 'a.pdf', 'content': b'...', 'mime_type': 'application/pdf'}]
            user:            User instance (optional).
            template:        EmailTemplate ORM instance (optional, for audit link).
            metadata:        Free-form JSON data attached to the EmailMessage.
            scheduled_at:    Future datetime for delayed send (async only).
            async_send:      True = enqueue Celery task, False = send in-band.
            skip_rate_limit: True = bypass rate limiting (use for system/test sends).

        Returns:
            The created EmailMessage instance.

        Raises:
            EmailServiceError:  if sync send fails with no recovery path.
            RateLimitExceeded:  propagated from rate_limiter when limit is hit.
        """
        # --- Validate + normalise email address ---
        try:
            from .utils import validate_email_address
            to_email = validate_email_address(to_email)
        except ValueError as exc:
            raise EmailServiceError(f'Invalid recipient address: {exc}') from exc

        from_email = from_email or getattr(settings, 'DEFAULT_FROM_EMAIL', '')
        context = context or {}

        # ------------------------------------------------------------------
        # 1. Rate limit check BEFORE accepting the email
        # ------------------------------------------------------------------
        rate_limit_key = ''
        if not skip_rate_limit:
            rate_limit_key = cls._check_rate_limit(to_email, email_type, user)

        # ------------------------------------------------------------------
        # 2. Render template (if slug provided)
        # ------------------------------------------------------------------
        if template_slug:
            subject, body_html, body_text, template = cls._render_template(
                template_slug=template_slug,
                context=context,
                email_type=email_type,
                user=user,
                email=to_email,
            )
        else:
            body_text = body_text or cls._strip_html(body_html)

        # ------------------------------------------------------------------
        # 3. Unsubscribe check
        # ------------------------------------------------------------------
        if cls._is_unsubscribed(to_email, email_type):
            logger.info(
                'Skipping email to %s (type=%s): address is unsubscribed.',
                to_email, email_type,
            )
            return cls._create_message_record(
                to_email=to_email, to_name=to_name,
                from_email=from_email, from_name=from_name,
                reply_to=reply_to, subject=subject,
                body_html=body_html, body_text=body_text,
                email_type=email_type, priority=priority,
                status=EmailStatus.FAILED,
                error_message='Recipient is unsubscribed.',
                user=user, template=template,
                metadata=metadata or {},
                scheduled_at=scheduled_at,
                rate_limit_key=rate_limit_key,
            )

        # ------------------------------------------------------------------
        # 4. Create the EmailMessage DB record
        # ------------------------------------------------------------------
        message = cls._create_message_record(
            to_email=to_email, to_name=to_name,
            from_email=from_email, from_name=from_name,
            reply_to=reply_to, subject=subject,
            body_html=body_html, body_text=body_text,
            email_type=email_type, priority=priority,
            status=EmailStatus.QUEUED if async_send else EmailStatus.SENDING,
            user=user, template=template,
            metadata=metadata or {},
            scheduled_at=scheduled_at,
            rate_limit_key=rate_limit_key,
            rendered_html=body_html,
            rendered_text=body_text,
        )

        # ------------------------------------------------------------------
        # 5. Dispatch
        # ------------------------------------------------------------------
        if async_send:
            cls._enqueue(message)
        else:
            cls._send_now(
                message,
                cc=cc or [],
                bcc=bcc or [],
                attachments=attachments or [],
            )

        return message

    @classmethod
    def send_bulk(
        cls,
        recipients: List[dict],
        *,
        template_slug: Optional[str] = None,
        context_base: Optional[dict] = None,
        email_type: str = EmailType.BULK,
        priority: str = EmailPriority.LOW,
        async_send: bool = True,
    ) -> List[EmailMessage]:
        """
        Send the same template (with per-recipient context overrides) in batch.

        Args:
            recipients:    List of dicts with at least an 'email' key.
                           Each may include 'name', 'context' (override dict),
                           'user' (User instance).
            template_slug: Slug of the template to render.
            context_base:  Shared context merged with each recipient's context.
            email_type:    EmailType for all messages.
            priority:      EmailPriority for all messages.
            async_send:    True = Celery; False = inline.

        Returns:
            List of created EmailMessage instances (failures are logged, not raised).
        """
        context_base = context_base or {}
        results = []

        for r in recipients:
            rctx = {**context_base, **(r.get('context') or {})}
            try:
                msg = cls.send_email(
                    to_email=r['email'],
                    to_name=r.get('name', ''),
                    template_slug=template_slug,
                    context=rctx,
                    email_type=email_type,
                    priority=priority,
                    user=r.get('user'),
                    async_send=async_send,
                )
                results.append(msg)
            except Exception as exc:
                logger.warning('send_bulk: skipped %s — %s', r.get('email', '?'), exc)

        logger.info(
            'send_bulk: dispatched %d/%d emails (type=%s)',
            len(results), len(recipients), email_type,
        )
        return results

    @classmethod
    def send_now(cls, message: EmailMessage) -> EmailMessage:
        """
        Synchronously deliver an existing EmailMessage record.

        Primarily called by the Celery task, but also useful for critical /
        non-deferrable emails (e.g. security alerts).
        """
        return cls._send_now(message)

    @classmethod
    def render_template(
        cls,
        template_slug: str,
        context: dict,
        email_type: Optional[str] = None,
        user=None,
        email: str = '',
    ) -> tuple:
        """
        Public helper: render a template and return (subject, html, text).
        Does NOT create any DB records or send anything.
        """
        subject, html, text, _ = cls._render_template(
            template_slug=template_slug,
            context=context,
            email_type=email_type,
            user=user,
            email=email,
        )
        return subject, html, text

    @classmethod
    def get_user_email_preferences(cls, user_id) -> dict:
        """
        Return a dict of ``{category: bool}`` indicating which email types
        this user has opted out of.

        Example return value::

            {
                'all': False,
                'NOTIFICATION': True,   # True = opted out
                'BULK': True,
            }
        """
        from .models import EmailUnsubscribe
        qs = EmailUnsubscribe.objects.filter(user_id=user_id).values(
            'all_categories', 'categories',
        )
        prefs = {'all': False}
        for row in qs:
            if row['all_categories']:
                prefs['all'] = True
            for cat in (row.get('categories') or []):
                prefs[cat] = True
        return prefs

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @classmethod
    def _render_template(
        cls,
        template_slug: str,
        context: dict,
        email_type: Optional[str] = None,
        user=None,
        email: str = '',
    ):
        """
        Invoke TemplateEngine and return (subject, html, text, template_obj).
        Raises EmailServiceError on failure.
        """
        from .template_engine import TemplateEngine, TemplateNotFound

        try:
            subject, html_body, text_body = TemplateEngine.render(
                template_slug=template_slug,
                context=context,
                email_type=email_type,
                user=user,
                email=email,
            )
            # Attempt to resolve the template ORM object for the FK link
            from .models import EmailTemplate
            template_obj = EmailTemplate.objects.filter(
                slug=template_slug, is_active=True,
            ).order_by('-version').first()
        except TemplateNotFound as exc:
            logger.error('_render_template: template not found: %s', exc)
            raise EmailServiceError(str(exc)) from exc
        except Exception as exc:
            logger.error(
                '_render_template: render error for %r: %s', template_slug, exc,
            )
            raise EmailServiceError(f'Template rendering failed: {exc}') from exc

        return subject, html_body, text_body, template_obj

    @classmethod
    def _check_rate_limit(cls, to_email: str, email_type: str, user) -> str:
        """
        Check the rate limit and return the Redis key used (for audit).
        Propagates RateLimitExceeded; other errors are swallowed (fail-open).
        """
        from .rate_limiter import RateLimitExceeded, check_rate_limit
        user_id = getattr(user, 'pk', None)
        try:
            check_rate_limit(email_type, user_id=user_id, email=to_email)
            identifier = str(user_id) if user_id else to_email.lower()
            return f'email:rl:user:{email_type}:{identifier}'
        except RateLimitExceeded:
            raise
        except Exception as exc:
            logger.warning('Rate limit check failed (allowing send): %s', exc)
            return ''

    @classmethod
    def _create_message_record(
        cls,
        *,
        to_email: str,
        to_name: str,
        from_email: str,
        from_name: str,
        reply_to: str,
        subject: str,
        body_html: str,
        body_text: str,
        email_type: str,
        priority: str,
        status: str = EmailStatus.PENDING,
        error_message: str = '',
        user=None,
        template=None,
        metadata: dict,
        scheduled_at=None,
        rate_limit_key: str = '',
        rendered_html: str = '',
        rendered_text: str = '',
    ) -> EmailMessage:
        return EmailMessage.objects.create(
            to_email=to_email,
            to_name=to_name,
            from_email=from_email,
            from_name=from_name,
            reply_to=reply_to,
            subject=subject,
            body_html=body_html,
            body_text=body_text,
            email_type=email_type,
            priority=priority,
            status=status,
            error_message=error_message,
            user=user,
            template=template,
            metadata=metadata,
            scheduled_at=scheduled_at,
            rate_limit_key=rate_limit_key,
            rendered_html=rendered_html,
            rendered_text=rendered_text,
        )

    @classmethod
    def _send_now(
        cls,
        message: EmailMessage,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[dict]] = None,
    ) -> EmailMessage:
        """Deliver an EmailMessage synchronously via the provider registry."""
        message.status = EmailStatus.SENDING
        message.save(update_fields=['status'])

        # Prefer rendered/template content over raw body fields
        html_body = message.rendered_html or message.body_html
        text_body = message.rendered_text or message.body_text

        payload = EmailPayload(
            to_email=message.to_email,
            to_name=message.to_name,
            from_email=message.from_email,
            from_name=message.from_name,
            subject=message.subject,
            body_html=html_body,
            body_text=text_body,
            reply_to=message.reply_to,
            cc=cc or [],
            bcc=bcc or [],
            message_id=str(message.id),
            extra={'attachments': attachments or []},
        )

        result = provider_registry.send_with_failover(payload, email_type=message.email_type)

        if result.success:
            message.status = EmailStatus.SENT
            message.sent_at = timezone.now()
            message.provider_used = result.provider_name
            message.provider_message_id = result.provider_message_id or ''
            message.error_message = ''
            logger.info(
                'Email sent: id=%s type=%s to=%s provider=%s',
                message.id, message.email_type, message.to_email, result.provider_name,
            )
        else:
            message.status = EmailStatus.FAILED
            message.failed_at = timezone.now()
            message.retry_count += 1
            message.error_message = result.error_message
            logger.error(
                'Email failed: id=%s type=%s to=%s error="%s"',
                message.id, message.email_type, message.to_email, result.error_message,
            )

        message.save(update_fields=[
            'status', 'sent_at', 'failed_at', 'provider_used',
            'provider_message_id', 'retry_count', 'error_message',
        ])
        return message

    @classmethod
    def _enqueue(cls, message: EmailMessage) -> None:
        """Enqueue an EmailMessage for async delivery via Celery."""
        try:
            from .tasks import send_email_task
            send_email_task.delay(str(message.id))
            logger.debug('Email enqueued: id=%s type=%s', message.id, message.email_type)
        except Exception as exc:
            logger.warning(
                'Could not enqueue email id=%s (Celery error: %s) — sending synchronously.',
                message.id, exc,
            )
            cls._send_now(message)

    @classmethod
    def _is_unsubscribed(cls, email: str, email_type: str) -> bool:
        """Return True if this address has opted out of the given email type."""
        # Critical transactional emails cannot be opted out of
        if email_type in (EmailType.SECURITY_ALERT, EmailType.VERIFICATION):
            return False
        try:
            from .models import EmailUnsubscribe
            return EmailUnsubscribe.objects.filter(
                email__iexact=email,
                all_categories=True,
            ).exists()
        except Exception as exc:
            logger.warning('Unsubscribe check failed for %s: %s', email, exc)
            return False

    @staticmethod
    def _strip_html(html: str) -> str:
        """Generate a plain-text version from HTML."""
        from .template_engine import html_to_text
        return html_to_text(html)
