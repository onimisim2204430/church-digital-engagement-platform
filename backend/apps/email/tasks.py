"""
Celery tasks for the standalone email service.

Tasks
-----
send_email_task              - deliver a single EmailMessage by UUID
retry_failed_emails          - beat task: re-queue FAILED messages within retry budget
check_provider_health_task   - beat task: run health checks, update circuit breakers
bulk_send_task               - Phase 3: fan-out a batch of recipient dicts
cleanup_old_tracking_data    - Phase 3: delete EmailEvent rows older than 90 days
"""

import logging

logger = logging.getLogger('email.tasks')

try:
    from celery import shared_task as _shared_task  # noqa: F401
    _CELERY_AVAILABLE = True
except ImportError:
    _CELERY_AVAILABLE = False


if _CELERY_AVAILABLE:

    @_shared_task(
        bind=True,
        max_retries=3,
        default_retry_delay=60,
        autoretry_for=(Exception,),
        retry_backoff=True,
        retry_backoff_max=600,
        retry_jitter=True,
        name='email.send_email_task',
    )
    def send_email_task(self, message_id: str):
        from .models import EmailMessage
        from .services import EmailService

        try:
            message = EmailMessage.objects.get(id=message_id)
        except EmailMessage.DoesNotExist:
            logger.error('send_email_task: EmailMessage %s not found.', message_id)
            return

        if message.status not in ('QUEUED', 'PENDING', 'FAILED'):
            logger.debug('send_email_task: skipping %s (status=%s)', message_id, message.status)
            return

        if message.template_id and not message.rendered_html:
            try:
                from .template_engine import TemplateEngine
                slug = message.template.slug
                subj, html, text = TemplateEngine.render(slug, {}, user=message.user, email=message.to_email)
                message.rendered_html = html
                message.rendered_text = text
                message.subject = message.subject or subj
                message.save(update_fields=['rendered_html', 'rendered_text', 'subject'])
            except Exception as exc:
                logger.warning('send_email_task: lazy render failed for %s (%s)', message_id, exc)

        logger.info('send_email_task: delivering %s', message_id)
        result = EmailService.send_now(message)
        if result.status == 'FAILED' and result.can_retry:
            raise Exception(f'Email delivery failed (will retry): {result.error_message}')

    @_shared_task(name='email.retry_failed_emails')
    def retry_failed_emails():
        from datetime import timedelta
        from django.utils import timezone
        from .constants import EmailStatus
        from .models import EmailMessage

        cutoff = timezone.now() - timedelta(hours=24)
        candidates = EmailMessage.objects.filter(
            status=EmailStatus.FAILED, failed_at__gte=cutoff, retry_count__lt=3,
        ).order_by('priority', 'created_at')[:100]

        count = sum(1 for msg in candidates if send_email_task.delay(str(msg.id)) or True)
        logger.info('retry_failed_emails: re-queued %d messages', count)
        return count

    @_shared_task(name='email.check_provider_health')
    def check_provider_health_task():
        from .providers import provider_registry
        results = provider_registry.run_health_checks()
        healthy = [n for n, ok in results if ok]
        unhealthy = [n for n, ok in results if not ok]
        logger.info('check_provider_health: healthy=%s unhealthy=%s', healthy or 'none', unhealthy or 'none')
        return {'healthy': healthy, 'unhealthy': unhealthy}

    @_shared_task(bind=True, max_retries=2, default_retry_delay=30, name='email.bulk_send_task')
    def bulk_send_task(self, recipients: list, template_slug: str, context_base: dict = None):
        from .constants import EmailPriority, EmailType
        from .services import EmailService
        chunk = recipients[:50]
        results = EmailService.send_bulk(
            recipients=chunk, template_slug=template_slug, context_base=context_base or {},
            email_type=EmailType.BULK, priority=EmailPriority.LOW, async_send=False,
        )
        logger.info('bulk_send_task: sent %d/%d (template=%s)', len(results), len(chunk), template_slug)
        return len(results)

    @_shared_task(name='email.cleanup_old_tracking_data')
    def cleanup_old_tracking_data():
        from datetime import timedelta
        from django.utils import timezone
        from .models import EmailEvent
        cutoff = timezone.now() - timedelta(days=90)
        deleted, _ = EmailEvent.objects.filter(created_at__lt=cutoff).delete()
        logger.info('cleanup_old_tracking_data: deleted %d EmailEvent rows', deleted)
        return deleted

    @_shared_task(
        bind=True,
        max_retries=3,
        default_retry_delay=60,
        autoretry_for=(Exception,),
        retry_backoff=True,
        retry_backoff_max=600,
        retry_jitter=True,
        name='email.send_email_by_params_task',
    )
    def send_email_by_params_task(
        self,
        *,
        to_email: str,
        template_slug: str = None,
        context: dict = None,
        subject: str = '',
        body_html: str = '',
        body_text: str = '',
        email_type: str = 'NOTIFICATION',
        priority: str = 'MEDIUM',
        user_id: str = '',
    ):
        """
        Receive serialisable primitives, do ALL email work inside the Celery
        worker (zero DB/template queries on the HTTP request thread).
        """
        from .services import EmailService
        user = None
        if user_id:
            try:
                from apps.users.models import User
                user = User.objects.get(id=user_id)
            except Exception:
                pass
        EmailService.send_email(
            to_email=to_email,
            template_slug=template_slug,
            context=context or {},
            subject=subject,
            body_html=body_html,
            body_text=body_text,
            email_type=email_type,
            priority=priority,
            user=user,
            async_send=False,  # already inside Celery worker
        )

else:

    class _SyncProxy:
        task_name = ''

        @classmethod
        def delay(cls, *args, **kwargs):
            return cls._run(*args, **kwargs)

        @classmethod
        def _run(cls, *args, **kwargs):
            raise NotImplementedError

    class send_email_task(_SyncProxy):
        task_name = 'email.send_email_task'

        @classmethod
        def _run(cls, message_id: str):
            from .models import EmailMessage
            from .services import EmailService
            try:
                message = EmailMessage.objects.get(id=message_id)
                EmailService.send_now(message)
            except EmailMessage.DoesNotExist:
                logger.error('send_email_task (sync): message %s not found', message_id)

    class retry_failed_emails(_SyncProxy):
        task_name = 'email.retry_failed_emails'

        @classmethod
        def _run(cls):
            logger.debug('retry_failed_emails (sync proxy): no-op without Celery')

    class check_provider_health_task(_SyncProxy):
        task_name = 'email.check_provider_health'

        @classmethod
        def _run(cls):
            from .providers import provider_registry
            return provider_registry.run_health_checks()

    class bulk_send_task(_SyncProxy):
        task_name = 'email.bulk_send_task'

        @classmethod
        def _run(cls, recipients: list, template_slug: str, context_base: dict = None):
            from .constants import EmailPriority, EmailType
            from .services import EmailService
            EmailService.send_bulk(
                recipients=recipients[:50], template_slug=template_slug,
                context_base=context_base or {}, email_type=EmailType.BULK,
                priority=EmailPriority.LOW, async_send=False,
            )

    class cleanup_old_tracking_data(_SyncProxy):
        task_name = 'email.cleanup_old_tracking_data'

        @classmethod
        def _run(cls):
            logger.debug('cleanup_old_tracking_data (sync proxy): no-op without Celery')

    class send_email_by_params_task(_SyncProxy):
        """Fallback (no Celery): run email creation + send synchronously."""
        task_name = 'email.send_email_by_params_task'

        @classmethod
        def _run(cls, *, to_email: str, template_slug: str = None, context: dict = None,
                 subject: str = '', body_html: str = '', body_text: str = '',
                 email_type: str = 'NOTIFICATION', priority: str = 'MEDIUM',
                 user_id: str = ''):
            from .services import EmailService
            user = None
            if user_id:
                try:
                    from apps.users.models import User
                    user = User.objects.get(id=user_id)
                except Exception:
                    pass
            EmailService.send_email(
                to_email=to_email,
                template_slug=template_slug,
                context=context or {},
                subject=subject,
                body_html=body_html,
                body_text=body_text,
                email_type=email_type,
                priority=priority,
                user=user,
                async_send=False,
            )
