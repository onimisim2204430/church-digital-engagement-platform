"""Background task hooks for notifications (optional Celery support)."""

import logging
from typing import Any, Dict

logger = logging.getLogger('notifications')

try:
    from celery import shared_task
except Exception:  # pragma: no cover
    shared_task = None


if shared_task:
    @shared_task(bind=True, max_retries=3, default_retry_delay=5, ignore_result=True)
    def create_notification_task(self, payload: Dict[str, Any]):
        from .services import NotificationService

        NotificationService.notify_user_by_id(
            user_id=str(payload.get('user_id', '')),
            notification_type=payload.get('notification_type', ''),
            title=payload.get('title', ''),
            message=payload.get('message', ''),
            metadata=payload.get('metadata') or {},
            priority=payload.get('priority'),
            source_module=payload.get('source_module'),
        )

    @shared_task(
        bind=True,
        max_retries=2,
        default_retry_delay=15,
        ignore_result=True,
        name='notifications.notify_admin_group_task',
    )
    def notify_admin_group_task(
        self,
        notification_type: str,
        title: str,
        message: str,
        metadata: dict = None,
        source_module: str = 'payment',
        priority: str = 'MEDIUM',
    ):
        """
        Fan-out a notification to all ADMIN users and all MODERATOR users
        who have any fin.* permission.  Called fire-and-forget from payment
        signals so admin/finance staff see live payment activity in their
        admin top-bar without any latency hit on the webhook response path.
        """
        from apps.users.models import User, ModeratorPermission
        from .services import NotificationService

        # 1. Find all active ADMIN users
        target_users = list(User.objects.filter(role='ADMIN', is_active=True))

        # 2. Find MODERATOR users that have at least one fin.* permission
        fin_mods = (
            ModeratorPermission.objects
            .filter(user__role='MODERATOR', user__is_active=True)
            .select_related('user')
        )
        for mp in fin_mods:
            if any(str(p).startswith('fin.') for p in (mp.permissions or [])):
                target_users.append(mp.user)

        seen: set = set()
        for user in target_users:
            uid = str(user.id)
            if uid in seen:
                continue
            seen.add(uid)
            try:
                NotificationService.notify_user(
                    user=user,
                    notification_type=notification_type,
                    title=title,
                    message=message,
                    metadata=metadata or {},
                    priority=priority,
                    source_module=source_module,
                )
            except Exception:
                logger.exception('notify_admin_group_task: failed for user %s', uid)

else:
    class _SyncTaskProxy:
        @staticmethod
        def delay(payload: Dict[str, Any]):
            from .services import NotificationService

            return NotificationService.notify_user_by_id(
                user_id=str(payload.get('user_id', '')),
                notification_type=payload.get('notification_type', ''),
                title=payload.get('title', ''),
                message=payload.get('message', ''),
                metadata=payload.get('metadata') or {},
                priority=payload.get('priority'),
                source_module=payload.get('source_module'),
            )

    create_notification_task = _SyncTaskProxy()

    class _AdminGroupTaskProxy:
        """No-op fallback when Celery is unavailable."""
        @staticmethod
        def delay(
            notification_type: str,
            title: str,
            message: str,
            metadata: dict = None,
            source_module: str = 'payment',
            priority: str = 'MEDIUM',
        ):
            pass  # silent no-op — admin notifications need Celery

    notify_admin_group_task = _AdminGroupTaskProxy()
