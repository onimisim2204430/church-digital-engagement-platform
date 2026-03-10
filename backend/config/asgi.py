"""
ASGI config for Church Digital Engagement Platform with WebSocket support.

This configuration handles both HTTP and WebSocket protocols:
- HTTP: Routed through Django
- WebSocket: Routed through Django Channels consumers

Supports horizontal scaling via Redis channel layer.
For production, use Daphne ASGI server with Nginx reverse proxy.

DEPLOYMENT:
  development:
    daphne -b 0.0.0.0 -p 8000 config.asgi:application

  production:
    Use Daphne behind Nginx with proper SSL/TLS configuration
    Example Nginx upstream:
      upstream daphne {
        server localhost:8000;
      }
"""

import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Initialize Django ASGI app early to ensure the AppRegistry is populated
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator

from apps.notifications.routing import websocket_urlpatterns
from apps.notifications.jwt_middleware import JWTAuthMiddleware

# Production-grade ASGI application with proper security and error handling
application = ProtocolTypeRouter({
    # HTTP and WSGI requests are served through Django's ASGI app
    'http': django_asgi_app,
    
    # WebSocket requests with JWT + session authentication
    'websocket': AllowedHostsOriginValidator(
        JWTAuthMiddleware(  # JWT auth from query string (?token=xxx)
            AuthMiddlewareStack(  # Fallback to session auth
                URLRouter(
                    websocket_urlpatterns
                )
            )
        )
    ),
})

# Optional: Add error handling for graceful degradation
try:
    import logging
    logger = logging.getLogger('asgi')
except Exception:
    pass

