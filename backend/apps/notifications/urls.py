"""URL routes for notifications app."""

from django.urls import path

from .views import (
    AdminNotificationListView,
    MarkAllNotificationsReadView,
    MarkNotificationReadView,
    NotificationListView,
    UnreadNotificationListView,
)
from .test_views import TestNotificationView

app_name = 'notifications'

urlpatterns = [
    path('', NotificationListView.as_view(), name='list'),
    path('unread/', UnreadNotificationListView.as_view(), name='unread'),
    path('read/<uuid:notification_id>/', MarkNotificationReadView.as_view(), name='read-one'),
    path('read-all/', MarkAllNotificationsReadView.as_view(), name='read-all'),
    # Admin-scoped role-filtered feed for the admin top bar
    path('admin/', AdminNotificationListView.as_view(), name='admin-list'),
    # Development test endpoint
    path('test/', TestNotificationView.as_view(), name='test'),
]
