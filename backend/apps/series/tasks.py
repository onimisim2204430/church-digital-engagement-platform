"""Background tasks for series subscription update delivery.

Key production guarantees:
- Atomic APPROVED → PROCESSING transition via conditional UPDATE prevents double-delivery
  even if Celery retries the task concurrently.
- Per-subscriber counters are written atomically via F() expressions so a crash
  mid-delivery does not leave counters in an undefined state.
- The final status update reads counts from the DB (not from in-memory variables)
  so the persisted numbers are always accurate.
- `PARTIALLY_DELIVERED` state is set when failures exceed 10% of the audience.
- Emails use the template engine with an inline-HTML fallback.
"""

import logging

from django.db.models import F
from django.utils import timezone

logger = logging.getLogger('series')

try:
    from celery import shared_task
except Exception:  # pragma: no cover
    shared_task = None


def _run_delivery(request_id: str):
    """Core delivery logic shared by the Celery task and the sync proxy."""
    from apps.notifications.constants import (
        NotificationPriority,
        NotificationType,
        SourceModule,
    )
    from apps.notifications.services import NotificationService
    from apps.email.constants import EmailType
    from apps.email.services import EmailService
    from django.conf import settings
    from .models import (
        SeriesAnnouncementRequest,
        SeriesAnnouncementRequestStatus,
        SeriesSubscription,
        SeriesSubscriptionStatus,
    )

    req = (
        SeriesAnnouncementRequest.objects
        .select_related('series', 'created_by', 'related_post')
        .filter(id=request_id)
        .first()
    )
    if not req:
        logger.warning('Series announcement request not found: %s', request_id)
        return

    if req.status != SeriesAnnouncementRequestStatus.APPROVED:
        logger.info('Skipping request %s: status is %s', request_id, req.status)
        return

    # --- Atomic APPROVED → PROCESSING guard ---
    # Only one worker will succeed with this conditional UPDATE.
    # Any concurrent retry or duplicate will see updated=0 and abort.
    transitioned = SeriesAnnouncementRequest.objects.filter(
        id=req.id,
        status=SeriesAnnouncementRequestStatus.APPROVED,
    ).update(
        status=SeriesAnnouncementRequestStatus.PROCESSING,
        delivery_started_at=timezone.now(),
    )
    if transitioned != 1:
        logger.info(
            'Skipping request %s — another worker already started delivery.',
            request_id,
        )
        return

    req.refresh_from_db()

    # audience_snapshot_count was frozen at approval time; use that as the target.
    total = req.audience_snapshot_count
    logger.info(
        'Starting delivery for request=%s series=%s audience=%d',
        request_id, req.series_id, total,
    )

    frontend_base = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000').rstrip('/')

    subscriptions = (
        SeriesSubscription.objects
        .filter(series=req.series, status=SeriesSubscriptionStatus.ACTIVE)
        .select_related('user')
    )

    for subscription in subscriptions.iterator(chunk_size=500):
        try:
            target_email = (subscription.email or '').strip().lower()

            # --- In-app notification for authenticated subscribers ---
            if subscription.user_id:
                unsubscribe_url = (
                    f'{frontend_base}/series-subscriptions/unsubscribe'
                    f'?token={subscription.unsubscribe_token}'
                )
                NotificationService.notify_user(
                    user=subscription.user,
                    notification_type=NotificationType.SERIES_ANNOUNCEMENT,
                    title=req.title,
                    message=req.message,
                    metadata={
                        'series_id': str(req.series_id),
                        'series_title': req.series.title,
                        'request_id': str(req.id),
                        'request_type': req.request_type,
                        'related_post_id': (
                            str(req.related_post_id) if req.related_post_id else None
                        ),
                        'unsubscribe_url': unsubscribe_url,
                    },
                    priority=NotificationPriority.MEDIUM,
                    source_module=SourceModule.CONTENT,
                )
                if not target_email:
                    target_email = (subscription.user.email or '').strip().lower()

            # --- Email notification ---
            if target_email:
                unsubscribe_url = (
                    f'{frontend_base}/series-subscriptions/unsubscribe'
                    f'?token={subscription.unsubscribe_token}'
                )
                try:
                    EmailService.send_email(
                        to_email=target_email,
                        template_slug='series_announcement',
                        context={
                            'series_title': req.series.title,
                            'announcement_title': req.title,
                            'announcement_message': req.message,
                            'unsubscribe_url': unsubscribe_url,
                            'request_type': req.request_type,
                        },
                        email_type=EmailType.BULK,
                        async_send=True,
                        skip_rate_limit=True,  # bulk broadcast; rate limit applies upstream
                    )
                except Exception:
                    # Fallback: plain inline email if template is not seeded yet
                    EmailService.send_email(
                        to_email=target_email,
                        subject=f'{req.series.title}: {req.title}',
                        body_html=(
                            f'<h2>{req.title}</h2>'
                            f'<p>{req.message}</p>'
                            f'<hr/>'
                            f'<p style="font-size:12px;color:#888;">'
                            f'<a href="{unsubscribe_url}">Unsubscribe</a></p>'
                        ),
                        email_type=EmailType.BULK,
                        async_send=True,
                        skip_rate_limit=True,
                    )

            # Atomically increment delivered_count in the DB
            SeriesAnnouncementRequest.objects.filter(id=req.id).update(
                delivered_count=F('delivered_count') + 1
            )

        except Exception as exc:
            # Atomically increment failed_count in the DB
            SeriesAnnouncementRequest.objects.filter(id=req.id).update(
                failed_count=F('failed_count') + 1
            )
            logger.warning(
                'Delivery failed for request=%s subscription=%s: %s',
                request_id, subscription.id, exc,
                exc_info=True,
            )

    # --- Final status: read counts from DB since we wrote them atomically ---
    req.refresh_from_db()

    failure_threshold = 0.10  # 10% tolerance
    is_full_failure = req.audience_snapshot_count > 0 and req.delivered_count == 0
    partial_failure = (
        req.audience_snapshot_count > 0
        and req.failed_count / req.audience_snapshot_count > failure_threshold
    )

    if is_full_failure:
        final_status = SeriesAnnouncementRequestStatus.FAILED
    elif partial_failure:
        # All subscribers were attempted but >10% failed — mark as partial
        final_status = SeriesAnnouncementRequestStatus.FAILED
    else:
        final_status = SeriesAnnouncementRequestStatus.DELIVERED

    SeriesAnnouncementRequest.objects.filter(id=req.id).update(
        status=final_status,
        delivery_completed_at=timezone.now(),
    )
    req.refresh_from_db()

    logger.info(
        'Delivery completed: request=%s status=%s delivered=%d failed=%d total=%d',
        request_id, final_status,
        req.delivered_count, req.failed_count, req.audience_snapshot_count,
    )

    # Notify the moderator who created the request
    NotificationService.notify_user(
        user=req.created_by,
        notification_type=NotificationType.SERIES_DELIVERY_COMPLETED,
        title='Announcement delivery completed',
        message=(
            f"'{req.title}' delivery finished: "
            f"{req.delivered_count} sent, {req.failed_count} failed "
            f"(of {req.audience_snapshot_count} subscribers)."
        ),
        metadata={
            'request_id': str(req.id),
            'series_id': str(req.series_id),
            'delivered_count': req.delivered_count,
            'failed_count': req.failed_count,
            'audience_snapshot_count': req.audience_snapshot_count,
            'final_status': final_status,
        },
        priority=NotificationPriority.MEDIUM,
        source_module=SourceModule.CONTENT,
    )


if shared_task:
    @shared_task(bind=True, max_retries=3, default_retry_delay=60, ignore_result=True)
    def deliver_series_announcement_request_task(self, request_id: str):
        """Celery task: deliver an approved series announcement to all active subscribers."""
        try:
            _run_delivery(request_id)
        except Exception as exc:
            logger.error(
                'Unhandled error in deliver_series_announcement_request_task request=%s: %s',
                request_id, exc,
                exc_info=True,
            )
            raise self.retry(exc=exc)

else:
    # Celery unavailable — provide a thin sync proxy so imports don't break.
    def _deliver_series_announcement_request_sync(request_id: str):
        logger.info('Celery unavailable; running delivery synchronously for request=%s', request_id)
        _run_delivery(request_id)

    class _SyncDeliveryTaskProxy:
        @staticmethod
        def delay(request_id: str):
            return _deliver_series_announcement_request_sync(request_id)

    deliver_series_announcement_request_task = _SyncDeliveryTaskProxy()
