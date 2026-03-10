# WebSocket Integration - Testing & Integration Guide

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install daphne channels channels-redis
```

### 2. Update Django Settings

Settings are already configured in `config/settings.py`:
- `ASGI_APPLICATION = 'config.asgi.application'`
- `CHANNEL_LAYERS` configured with Redis
- `daphne` and `channels` in `INSTALLED_APPS`

### 3. Run Development Server

```bash
# Terminal 1: Start Daphne server
daphne -b 0.0.0.0 -p 8000 config.asgi:application

# Or use Django's runserver with Channels support
python manage.py runserver
```

### 4. Test WebSocket Connection

```bash
# Browser console
const ws = new WebSocket('ws://127.0.0.1:8000/ws/notifications/');
ws.onopen = () => console.log('Connected!');
ws.onmessage = e => console.log('Message:', JSON.parse(e.data));
ws.onerror = e => console.error('Error:', e);
ws.onclose = e => console.log('Closed');
```

## Integration Points

### 1. Creating Notifications with WebSocket

The notification system automatic sends WebSocket events after saving to the database:

```python
from apps.notifications.services import NotificationService
from apps.notifications.constants import NotificationType

# User must be authenticated
user = request.user

# This automatically:
# 1. Creates notification in database
# 2. Sends it via WebSocket to connected clients
# 3. Logs any WebSocket errors (doesn't crash)
notification = NotificationService.notify_user(
    user=user,
    notification_type=NotificationType.PAYMENT_SUCCESS,
    title='Payment Successful',
    message='Your payment of ₦5000 was received',
    metadata={'payment_id': 'pay_123'},
)
```

### 2. Payment Integration Example

```python
# In payment success handler
from apps.notifications.services import NotificationService
from apps.notifications.constants import NotificationType, SourceModule

def handle_payment_success(payment):
    """Notify user when payment succeeds."""
    NotificationService.notify_user(
        user=payment.user,
        notification_type=NotificationType.PAYMENT_SUCCESS,
        title='Payment Successful',
        message=f'Your payment of ₦{payment.amount} was successful',
        metadata={
            'payment_id': str(payment.id),
            'amount': payment.amount,
            'reference': payment.reference,
        },
        priority='HIGH',
        source_module=SourceModule.PAYMENTS,
    )
```

### 3. User Isolation

Each connected user only receives notifications meant for them:

```python
# Group name: user_{user_id}
# Only this specific user's connected WebSocket clients receive messages
group_name = f'user_{user.id}'

# This ensures:
# - User A cannot see User B's notifications
# - Notifications are delivered to all of User A's devices
# - Scalable via Redis (works across multiple servers)
```

## Testing

### Unit Tests

Run existing notification tests:

```bash
python manage.py test apps.notifications.tests
```

### WebSocket Connection Test

```python
# test_websocket.py
import pytest
import json
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from apps.notifications.consumers import NotificationConsumer

User = get_user_model()

@pytest.mark.asyncio
async def test_notification_consumer_connect_authenticated():
    """Test authenticated user can connect to WebSocket."""
    user = await User.objects.acreate(
        email='test@example.com',
        password='testpass123',
        is_authenticated=True
    )
    
    communicator = WebsocketCommunicator(
        NotificationConsumer.as_asgi(),
        '/ws/notifications/'
    )
    communicator.scope['user'] = user
    
    connected, subprotocol = await communicator.connect()
    assert connected
    
    # Receive connection message
    response = await communicator.receive_json_from()
    assert response['type'] == 'connection_established'


@pytest.mark.asyncio
async def test_notification_consumer_rejects_anonymous():
    """Test anonymous users are rejected."""
    communicator = WebsocketCommunicator(
        NotificationConsumer.as_asgi(),
        '/ws/notifications/'
    )
    # Don't set user (defaults to AnonymousUser)
    
    connected, subprotocol = await communicator.connect()
    assert not connected  # Should be rejected
```

### Integration Test - Send Notification & Receive via WebSocket

```python
# test_notification_integration.py
import pytest
import asyncio
import json
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from apps.notifications.services import NotificationService
from apps.notifications.constants import NotificationType
from apps.notifications.consumers import NotificationConsumer

User = get_user_model()

@pytest.mark.asyncio
async def test_send_notification_receives_via_websocket():
    """Test that creating a notification sends it via WebSocket."""
    # Create user
    user = await User.objects.acreate(
        email='test@example.com',
        password='testpass123'
    )
    
    # Connect WebSocket
    communicator = WebsocketCommunicator(
        NotificationConsumer.as_asgi(),
        '/ws/notifications/'
    )
    communicator.scope['user'] = user
    
    connected, _ = await communicator.connect()
    assert connected
    
    # Receive connection message
    conn_msg = await communicator.receive_json_from()
    assert conn_msg['type'] == 'connection_established'
    
    # Create notification (will send via WebSocket)
    notification = await asyncio.to_thread(
        NotificationService.notify_user,
        user=user,
        notification_type=NotificationType.SYSTEM_ALERT,
        title='Test Alert',
        message='This is a test notification',
    )
    
    assert notification is not None
    
    # Receive notification via WebSocket
    received = await communicator.receive_json_from()
    assert received['id'] == str(notification.id)
    assert received['title'] == 'Test Alert'
    assert received['message'] == 'This is a test notification'
    
    # Disconnect
    await communicator.disconnect()
```

### Load Testing

```python
# test_websocket_load.py
import asyncio
import time
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from apps.notifications.consumers import NotificationConsumer
from apps.notifications.services import NotificationService
from apps.notifications.constants import NotificationType

User = get_user_model()

async def create_connection(user):
    """Create a WebSocket connection for a user."""
    communicator = WebsocketCommunicator(
        NotificationConsumer.as_asgi(),
        '/ws/notifications/'
    )
    communicator.scope['user'] = user
    connected, _ = await communicator.connect()
    await communicator.receive_json_from()  # connection_established
    return communicator

async def send_notification(user):
    """Send notification from user (sync function in thread)."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None,
        lambda: NotificationService.notify_user(
            user=user,
            notification_type=NotificationType.SYSTEM_ALERT,
            title='Load Test',
            message='Testing WebSocket scalability'
        )
    )

async def test_websocket_load():
    """Load test: 100 concurrent connections receiving notifications."""
    # Create users
    users = []
    for i in range(100):
        user = await User.objects.acreate(
            email=f'user{i}@example.com',
            password='testpass123'
        )
        users.append(user)
    
    # Create connections
    start_time = time.time()
    connections = await asyncio.gather(
        *[create_connection(user) for user in users]
    )
    connection_time = time.time() - start_time
    print(f"Created 100 connections in {connection_time:.2f}s")
    
    # Send notifications
    start_time = time.time()
    notifications = await asyncio.gather(
        *[send_notification(user) for user in users]
    )
    send_time = time.time() - start_time
    print(f"Sent 100 notifications in {send_time:.2f}s")
    
    # Receive notifications
    start_time = time.time()
    received = await asyncio.gather(
        *[conn.receive_json_from() for conn in connections]
    )
    receive_time = time.time() - start_time
    print(f"Received 100 messages in {receive_time:.2f}s")
    
    # Cleanup
    for conn in connections:
        await conn.disconnect()
    
    # Assertions
    assert len(notifications) == 100
    assert len(received) == 100
    assert all(n is not None for n in notifications)
    
    print(f"\nLoad Test Results:")
    print(f"  Connection speed: {100/connection_time:.0f} conns/sec")
    print(f"  Send speed: {100/send_time:.0f} notifications/sec")
    print(f"  Receive speed: {100/receive_time:.0f} messages/sec")
```

### Browser Testing

```html
<!-- test_websocket.html -->
<!DOCTYPE html>
<html>
<head>
    <title>WebSocket Test</title>
    <style>
        body { font-family: monospace; margin: 20px; }
        #messages { 
            border: 1px solid #ccc;
            padding: 10px;
            height: 400px;
            overflow-y: auto;
            margin: 10px 0;
            background: #f5f5f5;
        }
        .message { 
            padding: 10px;
            margin: 5px 0;
            border-left: 4px solid #0066cc;
            background: white;
        }
        .error { border-left-color: #ff0000; }
        .success { border-left-color: #00cc00; }
        .info { border-left-color: #0066cc; }
        button { padding: 10px 20px; margin: 5px; cursor: pointer; }
    </style>
</head>
<body>
    <h1>WebSocket Notification Test</h1>
    
    <div>
        <button onclick="connect()">Connect</button>
        <button onclick="disconnect()">Disconnect</button>
        <button onclick="sendPing()">Send Ping</button>
        <button onclick="createTestNotification()">Create Test Notification</button>
    </div>
    
    <div id="messages"></div>
    
    <script>
        let ws = null;
        
        function connect() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const url = `${protocol}//${window.location.host}/ws/notifications/`;
            
            ws = new WebSocket(url);
            
            ws.onopen = () => {
                addMessage('Connected', 'success');
            };
            
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                addMessage(`Received: ${JSON.stringify(data, null, 2)}`, 'info');
            };
            
            ws.onerror = (event) => {
                addMessage('Error: ' + event.type, 'error');
            };
            
            ws.onclose = (event) => {
                addMessage(`Closed (code: ${event.code})`, 'error');
                ws = null;
            };
        }
        
        function disconnect() {
            if (ws) {
                ws.close();
            }
        }
        
        function sendPing() {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'ping' }));
            }
        }
        
        function createTestNotification() {
            // This should be called from a separate tab/window
            // After login, trigger a notification via the API:
            // POST /api/v1/notifications/test/
            fetch('/api/v1/notifications/test/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({
                    notification_type: 'SYSTEM_ALERT',
                    title: 'Test Notification',
                    message: 'This is a test notification via WebSocket'
                })
            }).then(r => r.json()).then(d => {
                addMessage(`Created notification: ${d.notification.id}`, 'success');
            });
        }
        
        function addMessage(msg, type = 'info') {
            const div = document.getElementById('messages');
            const el = document.createElement('div');
            el.className = `message ${type}`;
            el.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
            div.appendChild(el);
            div.scrollTop = div.scrollHeight;
        }
        
        function getAuthToken() {
            // Get from localStorage (adjust based on your auth method)
            return localStorage.getItem('access_token') || '';
        }
    </script>
</body>
</html>
```

## Fail-Safe Verification

### 1. Test WebSocket Failure - Notification Still Saved

```python
# Temporarily break WebSocket by pausing Redis
redis-cli DEBUG SLEEP 10

# Send notification - should still be saved to database
notification = NotificationService.notify_user(
    user=user,
    notification_type=NotificationType.SYSTEM_ALERT,
    title='Test',
    message='Should still be saved',
)

# Verify it's in database
assert notification is not None
assert Notification.objects.filter(id=notification.id).exists()

# API still works
GET /api/v1/notifications/  # Should include the notification
```

### 2. Test Redis Unavailable

```python
# Stop Redis
systemctl stop redis-server

# Send notifications - should still work (fail-safe)
notification = NotificationService.notify_user(
    user=user,
    notification_type=NotificationType.SYSTEM_ALERT,
    title='Test',
    message='Redis is unavailable',
)

# Verify notification still created
assert notification is not None
assert Notification.objects.filter(id=notification.id).exists()

# Start Redis
systemctl start redis-server

# Now next notifications work via WebSocket again
```

### 3. Test Anonymous WebSocket Rejection

```python
# Try to connect without authentication
const ws = new WebSocket('ws://127.0.0.1:8000/ws/notifications/');
// Will receive close code 4001 (Policy Violation)
```

## Monitoring Checklist

- [ ] Daphne process is running (`ps aux | grep daphne`)
- [ ] Redis is running and accessible (`redis-cli ping`)
- [ ] WebSocket port is open (TCP 8000 or 443 for wss://)
- [ ] Channel layer can connect to Redis
- [ ] Notifications are created in database
- [ ] WebSocket events are being sent (check logs)
- [ ] Connected clients receive messages
- [ ] Reconnection works after network failure
- [ ] API fallback works if WebSocket fails
- [ ] No exception loops in logs

## Performance Tuning

### For High Traffic

1. **Increase Daphne workers**: Run 4-8 instances
2. **Increase Redis memory**: Set appropriate maxmemory limit
3. **Tune channel layer capacity**: Increase if many queued messages
4. **Enable Message compression**: Reduces bandwidth

```python
# settings.py for high traffic
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [('redis-host', 6379)],
            'capacity': 5000,      # Increase from default
            'expiry': 10,
            'group_expiry': 10,
        },
    },
}
```

## Summary

✅ **System is fail-safe:**
- Notifications saved to database even if WebSocket fails
- REST API always available
- WebSocket is enhancement, not requirement

✅ **Scalable:**
- Redis channel layer for horizontal scaling
- Run multiple Daphne workers
- User-isolated groups prevent cross-talk

✅ **Secure:**
- Only authenticated users can connect
- Anonymous connections rejected
- User groups properly isolated

✅ **Tested:**
- Unit tests included
- Integration tests available
- Load testing framework provided
