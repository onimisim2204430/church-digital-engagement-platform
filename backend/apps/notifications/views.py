"""API views for user notifications."""

from django.db.models import QuerySet
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationSerializer
from .utils import get_unread_count

# Notification types that finance moderators (fin.*) are allowed to see
_FINANCE_TYPES = {'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'SYSTEM_ALERT', 'ADMIN_MESSAGE'}
# Notification types that all admin/mod staff always see
_ADMIN_ALL_TYPES = None  # None means unrestricted


class NotificationPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


def _is_admin_user(user) -> bool:
    return bool(
        user
        and user.is_authenticated
        and (
            getattr(user, 'is_staff', False)
            or getattr(user, 'is_superuser', False)
            or getattr(user, 'role', None) == 'ADMIN'
        )
    )


def _scoped_queryset(user, *, unread_only=False) -> QuerySet:
    queryset = Notification.objects.all()
    if not _is_admin_user(user):
        queryset = queryset.filter(user=user)
    if unread_only:
        queryset = queryset.filter(is_read=False)
    return queryset.order_by('-created_at')


class AdminNotificationListView(APIView):
    """
    GET  /api/v1/admin/notifications/           — role-filtered list (max 30)
    POST /api/v1/admin/notifications/read-all/  — mark all as read

    Access rules:
      - ADMIN       : sees all notification types created for their user account
      - MODERATOR   : sees only types relevant to their permission codes
                      fin.*  → PAYMENT_SUCCESS, PAYMENT_FAILED, SYSTEM_ALERT, ADMIN_MESSAGE
                      Others → SYSTEM_ALERT, ADMIN_MESSAGE only
      - Others      : 403
    """
    permission_classes = [IsAuthenticated]

    def _allowed_types(self, user):
        role = getattr(user, 'role', None)
        if role == 'ADMIN':
            return None  # unrestricted
        if role == 'MODERATOR':
            from apps.users.models import ModeratorPermission
            mp = ModeratorPermission.objects.filter(user=user).first()
            perms = mp.permissions if mp else []
            allowed = {'SYSTEM_ALERT', 'ADMIN_MESSAGE'}
            if any(str(p).startswith('fin.') for p in perms):
                allowed |= {'PAYMENT_SUCCESS', 'PAYMENT_FAILED'}
            if any(str(p).startswith('content.') for p in perms):
                allowed |= {
                    'SERIES_REQUEST_SUBMITTED',
                    'SERIES_REQUEST_APPROVED',
                    'SERIES_REQUEST_REJECTED',
                    'SERIES_DELIVERY_COMPLETED',
                }
            return allowed
        return set()  # no access

    def get(self, request):
        user = request.user
        allowed = self._allowed_types(user)
        if allowed is not None and len(allowed) == 0:
            return Response({'results': [], 'unread_count': 0})

        qs = Notification.objects.filter(user=user).order_by('-created_at')
        if allowed is not None:
            qs = qs.filter(notification_type__in=allowed)

        unread_count = qs.filter(is_read=False).count()
        items = qs[:30]
        serializer = NotificationSerializer(items, many=True)
        return Response({
            'results': serializer.data,
            'unread_count': unread_count,
        })

    def post(self, request):
        """POST to /admin/notifications/?action=read-all marks all as read."""
        user = request.user
        if getattr(user, 'role', None) not in ('ADMIN', 'MODERATOR'):
            return Response(status=status.HTTP_403_FORBIDDEN)
        Notification.objects.filter(user=user, is_read=False).update(
            is_read=True, read_at=timezone.now()
        )
        return Response({'status': 'ok'})


class NotificationListView(APIView):
    """GET /notifications/"""

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        queryset = _scoped_queryset(request.user)
        paginator = NotificationPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = NotificationSerializer(page, many=True)
        
        # Get paginated response structure
        paginated_response = paginator.get_paginated_response(serializer.data)
        
        # Add custom fields to the response data
        response_data = paginated_response.data
        response_data['status'] = 'success'
        response_data['unread_count'] = get_unread_count(request.user)
        
        return Response(response_data)


class UnreadNotificationListView(APIView):
    """GET /notifications/unread/"""

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        queryset = _scoped_queryset(request.user, unread_only=True)
        paginator = NotificationPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = NotificationSerializer(page, many=True)
        
        # Get paginated response structure
        paginated_response = paginator.get_paginated_response(serializer.data)
        
        # Add custom fields to the response data
        response_data = paginated_response.data
        response_data['status'] = 'success'
        response_data['unread_count'] = get_unread_count(request.user)
        
        return Response(response_data)


class MarkNotificationReadView(APIView):
    """POST /notifications/read/<id>/"""

    permission_classes = [IsAuthenticated]

    def post(self, request, notification_id, *args, **kwargs):
        queryset = _scoped_queryset(request.user)
        notification = get_object_or_404(queryset, id=notification_id)
        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(update_fields=['is_read', 'read_at'])

        return Response(
            {
                'status': 'success',
                'message': 'Notification marked as read',
                'id': str(notification.id),
            },
            status=status.HTTP_200_OK,
        )


class MarkAllNotificationsReadView(APIView):
    """POST /notifications/read-all/"""

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        queryset = Notification.objects.filter(user=request.user, is_read=False)
        updated = queryset.update(is_read=True, read_at=timezone.now())
        return Response(
            {'status': 'success', 'message': 'All notifications marked as read', 'updated': updated},
            status=status.HTTP_200_OK,
        )
