"""
WebSocket consumers for real-time notifications.

This module handles WebSocket connections for delivering notifications
in real-time using Django Channels and Redis.

SECURITY:
- Only authenticated users can open WebSocket connections
- Anonymous connections are immediately rejected
- Uses Django's built-in authentication system
- User isolation via group names (user_{user_id})

SCALABILITY:
- Uses Redis channel layer for multi-process/multi-server support
- Each user receives notifications through their isolated group
- Graceful degradation if Redis is unavailable
- Automatic reconnection on client side

ERROR HANDLING:
- All exceptions are caught and logged, never crash the consumer
- Connection failures don't affect database notifications
- Failed WebSocket sends won't break the notification service
"""

import asyncio
import json
import logging
from typing import Any, Dict

from asgiref.sync import async_to_sync
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model

logger = logging.getLogger('notifications')

User = get_user_model()


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time notification delivery.
    
    Lifecycle:
        1. Client connects to ws://domain/ws/notifications/
        2. Connection is authenticated (via AuthMiddlewareStack)
        3. User is added to group named user_{user_id}
        4. When notification is created, it's sent to this group
        5. Client receives JSON payload in real-time
        6. On disconnect, user is removed from group
    
    Fail-Safe Behavior:
        - If authentication fails, connection is rejected
        - If group operations fail, error is logged (subscriber still receives DB notifications via API)
        - If send_json fails, error is logged but doesn't crash the service
    """

    async def connect(self):
        """
        Handle WebSocket connection.
        
        Process:
        1. Check if user is authenticated
        2. Create a group name for this user (user_{user_id})
        3. Add connection to the group
        4. Send welcome message
        
        Security:
        - Rejects anonymous users
        - Uses Django's authentication from AuthMiddlewareStack
        """
        try:
            # Get user from scope (set by AuthMiddlewareStack)
            user = self.scope.get('user')
            
            # SECURITY: Reject unauthenticated connections
            if not user or not user.is_authenticated:
                logger.warning(
                    'Rejected anonymous WebSocket connection',
                    extra={'scope': self.scope.get('type')}
                )
                await self.close(code=4001)  # Policy violation
                return
            
            # Store user for later use
            self.user = user
            self.user_id = str(user.id)
            
            # Create unique group name for this user
            # This isolates notifications to only this user
            self.group_name = f'user_{self.user_id}'
            
            # Add this connection to the user's notification group
            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name,
            )
            
            # Accept the WebSocket connection
            await self.accept()
            
            # Send welcome message
            await self.send_json({
                'type': 'connection_established',
                'message': f'Connected to notification stream',
                'user_id': self.user_id,
                'timestamp': self._get_timestamp(),
            })
            
            logger.info(
                'WebSocket connection established',
                extra={'user_id': self.user_id}
            )

            # Renew group membership before Redis TTL expires.
            # group_expiry is 86400 s; we renew every 50 s as defence-in-depth.
            self._keepalive_task = asyncio.ensure_future(self._keepalive_loop())

        except Exception as e:
            # Fail-safe: Log error and close connection
            logger.exception(
                'Error during WebSocket connection',
                extra={
                    'user': getattr(self.scope.get('user'), 'email', 'unknown'),
                    'error': str(e),
                }
            )
            await self.close(code=1011)  # Server error

    async def _keepalive_loop(self):
        """
        Re-add this channel to the user's group every 50 seconds so the
        Redis group-membership TTL (group_expiry=86400) is never hit during
        an active session.  Also sends a server-side ping so the browser's
        idle-connection timeout doesn't silently kill the socket.
        """
        try:
            while True:
                await asyncio.sleep(50)
                try:
                    await self.channel_layer.group_add(self.group_name, self.channel_name)
                    await self.send_json({'type': 'ping', 'timestamp': self._get_timestamp()})
                except Exception:
                    pass  # connection already closing — will be cleaned up in disconnect
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.debug('Keepalive loop ended: %s', e)

    async def disconnect(self, close_code):
        """
        Handle WebSocket disconnection.

        Cleanup:
        1. Cancel keepalive loop
        2. Remove user from the notification group
        3. Log disconnection

        Note: If this fails, it's logged but doesn't affect anything
              since the connection is already closed.
        """
        try:
            # Stop the keepalive loop
            if hasattr(self, '_keepalive_task') and not self._keepalive_task.done():
                self._keepalive_task.cancel()
                try:
                    await self._keepalive_task
                except asyncio.CancelledError:
                    pass

            # Remove this connection from the group
            if hasattr(self, 'group_name'):
                await self.channel_layer.group_discard(
                    self.group_name,
                    self.channel_name,
                )
            
            logger.info(
                'WebSocket connection closed',
                extra={
                    'user_id': getattr(self, 'user_id', 'unknown'),
                    'close_code': close_code,
                }
            )
            
        except Exception as e:
            # Fail-safe: Just log, connection is already closed
            logger.exception(
                'Error during WebSocket disconnection',
                extra={'error': str(e)}
            )

    async def receive(self, text_data=None, bytes_data=None):
        """
        Handle incoming message from client.
        
        Currently, we don't process client messages.
        This consumer is one-way: server -> client only.
        
        Future: Could implement client-initiated actions like:
        - Marking notifications as read
        - Dismissing notifications
        - Requesting notification history
        """
        if text_data:
            try:
                data = json.loads(text_data)
                logger.debug(
                    'Received message from client',
                    extra={'user_id': self.user_id, 'data': data}
                )
                
                # Example: Echo back a pong for ping/pong keepalive
                if data.get('type') == 'ping':
                    await self.send_json({
                        'type': 'pong',
                        'timestamp': self._get_timestamp(),
                    })
                    
            except Exception as e:
                logger.error(
                    'Error processing client message',
                    extra={'user_id': self.user_id, 'error': str(e)}
                )

    async def send_notification(self, event):
        """
        Receive notification event from group and send to client.
        
        Called by:
        - NotificationService via group_send()
        - This method is automatically called when an event is sent to the group
        
        Event format (from NotificationService):
        {
            'type': 'send_notification',  # Required by Channels
            'id': notification_id,
            'title': notification_title,
            'message': notification_message,
            'notification_type': notification_type,
            'priority': priority,
            'created_at': timestamp,
            'metadata': {...}
        }
        
        This method is fail-safe - errors are logged but won't crash
        the notification service.
        """
        try:
            # Extract event data (remove 'type' which is Channels-specific)
            notification_data = {k: v for k, v in event.items() if k != 'type'}
            
            # Send notification to WebSocket client
            await self.send_json(notification_data)
            
            logger.debug(
                'Notification sent via WebSocket',
                extra={
                    'user_id': self.user_id,
                    'notification_id': event.get('id'),
                }
            )
            
        except Exception as e:
            # Fail-safe: Log error, don't propagate to caller
            # User will still receive notification via REST API
            logger.error(
                'Failed to send notification via WebSocket',
                extra={
                    'user_id': self.user_id,
                    'notification_id': event.get('id'),
                    'error': str(e),
                }
            )

    @staticmethod
    def _get_timestamp() -> str:
        """Get ISO 8601 formatted timestamp."""
        from django.utils import timezone
        return timezone.now().isoformat()


# Helper function for sending notifications to all group members
# Used by NotificationService
async def send_notification_to_user(
    user_id: str,
    notification_data: Dict[str, Any],
) -> bool:
    """
    Send notification to a specific user via their WebSocket group.
    
    This is a helper function called by NotificationService.
    
    Args:
        user_id: UUID of the user to notify
        notification_data: Dictionary with notification details
        
    Returns:
        bool: True if sent successfully, False otherwise
        
    Fail-Safe:
        - Returns False on error
        - Logs errors only
        - Never raises exceptions
    """
    try:
        from channels.layers import get_channel_layer
        
        channel_layer = get_channel_layer()
        group_name = f'user_{user_id}'
        
        # Prepare event with 'type' required by Channels
        event = {
            'type': 'send_notification',
            **notification_data
        }
        
        # Send event to all connections in the user's group
        await channel_layer.group_send(group_name, event)
        
        logger.debug(
            'Notification event sent to group',
            extra={
                'user_id': user_id,
                'group': group_name,
                'notification_id': notification_data.get('id'),
            }
        )
        
        return True
        
    except Exception as e:
        # Fail-safe: Log and return False
        # Caller (NotificationService) won't crash
        logger.error(
            'Failed to send notification to user via WebSocket',
            extra={
                'user_id': user_id,
                'error': str(e),
            }
        )
        return False
