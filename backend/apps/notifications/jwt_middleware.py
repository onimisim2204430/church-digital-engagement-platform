"""
JWT WebSocket Middleware

Authenticates WebSocket connections using JWT tokens passed via query string.
Supports both session-based auth (fallback) and JWT tokens.

Usage:
    Add to ASGI application before URLRouter:
    
    application = ProtocolTypeRouter({
        'websocket': AllowedHostsOriginValidator(
            JWTAuthMiddleware(  # <-- Add this
                AuthMiddlewareStack(
                    URLRouter(websocket_urlpatterns)
                )
            )
        ),
    })

Query String Format:
    ws://domain/ws/notifications/?token=<jwt_access_token>
"""

import logging
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from urllib.parse import parse_qs

logger = logging.getLogger('websocket')

User = get_user_model()


class JWTAuthMiddleware(BaseMiddleware):
    """
    Middleware to authenticate WebSocket connections via JWT tokens.
    
    Checks for JWT token in query string (?token=xxx), validates it,
    and attaches the user to scope['user'].
    
    Falls back to session auth if no token provided (for compatibility).
    """

    async def __call__(self, scope, receive, send):
        # Try JWT auth from query string first
        query_string = scope.get('query_string', b'').decode('utf-8')
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]

        if token:
            try:
                # Validate JWT token
                access_token = AccessToken(token)
                user_id = access_token['user_id']
                
                # Get user from database
                scope['user'] = await self.get_user_from_token(user_id)
                logger.info(f'[JWT WebSocket] Authenticated user {scope["user"].email} via JWT')
            
            except (InvalidToken, TokenError, KeyError) as e:
                logger.warning(f'[JWT WebSocket] Invalid token: {e}')
                scope['user'] = AnonymousUser()
            except Exception as e:
                logger.error(f'[JWT WebSocket] Auth error: {e}')
                scope['user'] = AnonymousUser()
        else:
            # No JWT token - user may already be authenticated via session (AuthMiddlewareStack)
            # Don't override scope['user'] if it already exists
            if 'user' not in scope or scope['user'] is None:
                scope['user'] = AnonymousUser()
                logger.debug('[JWT WebSocket] No token provided, using session auth')

        return await super().__call__(scope, receive, send)

    @database_sync_to_async
    def get_user_from_token(self, user_id):
        """Fetch user from database by ID"""
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return AnonymousUser()
