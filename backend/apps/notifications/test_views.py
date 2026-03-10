"""Development test endpoint for triggering notifications."""
import logging

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .constants import NotificationPriority, NotificationType, SourceModule
from .services import NotificationService

logger = logging.getLogger('notifications')


class TestNotificationView(APIView):
    """POST /notifications/test/ - Create a test notification for development."""

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """Create a test notification for the authenticated user."""
        notification_type = request.data.get('notification_type', NotificationType.SYSTEM_ALERT)
        title = request.data.get('title', f'Test Notification @ {timezone.now().strftime("%H:%M:%S")}')
        message = request.data.get('message', 'This is a test notification triggered from the API.')
        priority = request.data.get('priority', NotificationPriority.MEDIUM)
        source_module = request.data.get('source_module', SourceModule.SYSTEM)

        try:
            notification = NotificationService.notify_user(
                user=request.user,
                notification_type=notification_type,
                title=title,
                message=message,
                priority=priority,
                source_module=source_module,
            )

            if notification:
                return Response(
                    {
                        'status': 'success',
                        'message': 'Test notification created',
                        'notification': {
                            'id': str(notification.id),
                            'type': notification.notification_type,
                            'title': notification.title,
                            'message': notification.message,
                            'priority': notification.priority,
                            'created_at': notification.created_at.isoformat(),
                        },
                    },
                    status=status.HTTP_201_CREATED,
                )
            else:
                return Response(
                    {'status': 'error', 'message': 'Failed to create notification'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        except Exception as e:
            logger.exception('Test notification creation failed')
            return Response(
                {'status': 'error', 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
