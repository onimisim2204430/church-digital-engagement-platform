"""
WebSocket URL routing for notifications.

Defines WebSocket endpoint patterns and connects them to consumers.

URL Pattern:
    ws://domain/ws/notifications/
    
This endpoint is:
- Authenticated (only logged-in users)
- Secured (uses AllowedHostsOriginValidator in ASGI)
- Scalable (uses Redis channel layer)
"""

from django.urls import path, re_path

from .consumers import NotificationConsumer

websocket_urlpatterns = [
    # WebSocket endpoint for real-time notifications
    path(
        'ws/notifications/',
        NotificationConsumer.as_asgi(),
        name='notifications_ws'
    ),
]
