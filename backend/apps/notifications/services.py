"""Service layer for notification orchestration with real-time WebSocket support."""

import logging
from typing import Any, Dict, Optional

from django.contrib.auth import get_user_model
from django.utils import timezone

from .constants import NotificationPriority, NotificationType, SourceModule
from .models import Notification

logger = logging.getLogger('notifications')


def _send_websocket_notification(notification: Notification) -> bool:
    """
    Send notification via WebSocket to the user's connected clients.
    
    This is called after the notification is saved to the database.
    If WebSocket fails, the notification is still in the database and
    retrievable via REST API - this is the fail-safe guarantee.
    
    Args:
        notification: The Notification object that was just created
        
    Returns:
        bool: True if sent successfully, False otherwise (but never raises)
        
    Fail-Safe Design:
        - All exceptions are caught and logged
        - Always returns gracefully
        - Never propagates errors to caller
        - Notification remains in database even if WebSocket fails
    """
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        import json
        
        # Get the channel layer (Redis)
        channel_layer = get_channel_layer()
        if not channel_layer:
            logger.warning('Channel layer not available, WebSocket notification skipped')
            return False
        
        # Prepare notification payload for WebSocket
        event = {
            'type': 'send_notification',  # Required by Channels
            'id': str(notification.id),
            'title': notification.title,
            'message': notification.message,
            'notification_type': notification.notification_type,
            'priority': notification.priority,
            'source_module': notification.source_module,
            'is_read': notification.is_read,
            'created_at': notification.created_at.isoformat(),
            'metadata': notification.metadata or {},
        }
        
        # Send to user's notification group
        user_id = str(notification.user.id)
        group_name = f'user_{user_id}'
        
        # Call async function from sync context
        async_to_sync(channel_layer.group_send)(group_name, event)
        
        logger.debug(
            'WebSocket notification sent',
            extra={
                'user_id': user_id,
                'notification_id': str(notification.id),
                'type': notification.notification_type,
            }
        )
        
        return True
        
    except ImportError:
        # Channels not installed or not properly configured
        logger.debug('Channels not available, WebSocket notification skipped')
        return False
        
    except Exception as e:
        # Fail-safe: Log the error and return False
        # The notification is already saved in the database
        logger.error(
            'Failed to send WebSocket notification',
            extra={
                'notification_id': str(notification.id),
                'user_id': str(notification.user.id),
                'error': str(e),
                'error_type': type(e).__name__,
            },
            exc_info=True,  # Include full traceback
        )
        return False


class NotificationService:
    """Single entry point for creating notifications safely."""

    @staticmethod
    def notify_user(
        *,
        user,
        notification_type: str,
        title: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None,
        priority: str = NotificationPriority.MEDIUM,
        source_module: str = SourceModule.OTHER,
    ) -> Optional[Notification]:
        """
        Create a notification and deliver it in real-time.
        
        This method:
        1. Validates the input
        2. Creates the notification in the database
        3. Sends it via WebSocket to connected clients (if available)
        4. Returns the notification object
        
        All WebSocket operations are fail-safe - if they fail,
        the notification remains in the database and is still
        available via the REST API.
        
        Args:
            user: Django User instance
            notification_type: Type of notification (from NotificationType enum)
            title: Notification title (max 255 chars)
            message: Notification message
            metadata: Optional dict for custom data
            priority: Notification priority level
            source_module: Which module created this notification
            
        Returns:
            Notification object if successful, None otherwise
        """
        try:
            if not user or not getattr(user, 'is_authenticated', False):
                logger.warning('Skipping notification: unauthenticated user')
                return None

            if notification_type not in NotificationType.values:
                logger.warning('Invalid notification_type provided', extra={'notification_type': notification_type})
                return None

            if priority not in NotificationPriority.values:
                priority = NotificationPriority.MEDIUM

            if source_module not in SourceModule.values:
                source_module = SourceModule.OTHER

            # Create notification in database
            notification = Notification.objects.create_notification(
                user=user,
                notification_type=notification_type,
                title=str(title).strip()[:255],
                message=str(message).strip(),
                metadata=metadata or {},
                priority=priority,
                source_module=source_module,
            )
            
            # Send via WebSocket (fail-safe - errors are logged only)
            _send_websocket_notification(notification)
            
            return notification
            
        except Exception:
            logger.exception(
                'Failed to create notification',
                extra={
                    'user_id': getattr(user, 'id', None),
                    'notification_type': notification_type,
                    'source_module': source_module,
                },
            )
            return None

    @classmethod
    def send_notification(cls, **kwargs) -> Optional[Notification]:
        """Alias for consistent service-layer API naming."""
        return cls.notify_user(**kwargs)

    @classmethod
    def notify_user_async(cls, **kwargs) -> Optional[Notification]:
        """Use Celery if available, otherwise fallback to sync execution."""
        try:
            from .tasks import create_notification_task

            payload = dict(kwargs)
            user = payload.pop('user', None)
            payload['user_id'] = str(getattr(user, 'id', payload.get('user_id', '')))

            result = create_notification_task.delay(payload=payload)
            logger.info('Notification queued asynchronously', extra={'task_id': str(getattr(result, 'id', None))})
            return None
        except Exception:
            logger.exception('Async notification dispatch unavailable; falling back to sync')
            return cls.notify_user(**kwargs)

    @staticmethod
    def format_payment_success(*, amount: Any, payment_id: str) -> Dict[str, Any]:
        """Generate a standard payment success payload."""
        return {
            'notification_type': NotificationType.PAYMENT_SUCCESS,
            'title': 'Payment Successful',
            'message': 'Your payment has been successfully processed.',
            'metadata': {'amount': amount, 'payment_id': payment_id},
            'priority': NotificationPriority.MEDIUM,
            'source_module': SourceModule.PAYMENT,
        }

    @staticmethod
    def format_payment_failed(*, amount: Any, payment_id: str, reason: str = '') -> Dict[str, Any]:
        """Generate a standard payment failure payload."""
        return {
            'notification_type': NotificationType.PAYMENT_FAILED,
            'title': 'Payment Failed',
            'message': 'Your payment could not be processed. Please try again.',
            'metadata': {'amount': amount, 'payment_id': payment_id, 'reason': reason},
            'priority': NotificationPriority.HIGH,
            'source_module': SourceModule.PAYMENT,
        }

    @staticmethod
    def notify_user_by_id(*, user_id: str, **payload) -> Optional[Notification]:
        """Resolve user and create notification safely by id."""
        try:
            user = get_user_model().objects.filter(id=user_id).first()
            if user is None:
                return None
            return NotificationService.notify_user(user=user, **payload)
        except Exception:
            logger.exception('Failed notify_user_by_id', extra={'user_id': user_id})
            return None
