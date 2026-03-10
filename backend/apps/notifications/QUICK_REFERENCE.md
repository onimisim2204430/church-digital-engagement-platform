# Real-Time Notifications with WebSocket - Quick Reference

## 10-Second Quick Start

```python
# Send a notification (anywhere in Django code)
from apps.notifications.services import NotificationService
from apps.notifications.constants import NotificationType, SourceModule

notification = NotificationService.notify_user(
    user=request.user,
    notification_type=NotificationType.PAYMENT_SUCCESS,
    title='Payment Received',
    message='Your payment was processed successfully',
    source_module=SourceModule.PAYMENTS,
)
# Done! It's saved to DB and sent via WebSocket automatically
```

```javascript
// Connect to WebSocket (JavaScript)
const ws = new WebSocket('ws://127.0.0.1:8000/ws/notifications/');
ws.onmessage = (e) => {
    const notification = JSON.parse(e.data);
    console.log('New notification:', notification.title);
};
```

## Common Tasks

### Create Payment Success Notification

```python
NotificationService.notify_user(
    user=payment.user,
    notification_type=NotificationType.PAYMENT_SUCCESS,
    title=f'Payment of ₦{payment.amount} successful',
    message=f'Reference: {payment.reference}',
    metadata={'payment_id': str(payment.id), 'amount': payment.amount},
    priority='HIGH',
    source_module=SourceModule.PAYMENTS,
)
```

### Create Content Published Notification

```python
NotificationService.notify_user(
    user=content.creator,
    notification_type=NotificationType.CONTENT_PUBLISHED,
    title='Your content is live',
    message=f'"{content.title}" is now public',
    metadata={'content_id': str(content.id)},
    source_module=SourceModule.CONTENT,
)
```

### Listen for Notifications in React

```jsx
import { useWebSocketNotifications } from './hooks/useWebSocketNotifications';

function App() {
    const { isConnected, lastNotification } = useWebSocketNotifications({
        onNotification: (notif) => {
            showToast(notif.title, notif.message);
        },
    });

    return (
        <div>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
    );
}
```

### Mark Notification as Read (REST API)

```javascript
// Single notification
await fetch(`/api/v1/notifications/read/${id}/`, { method: 'POST' });

// All notifications
await fetch('/api/v1/notifications/read-all/', { method: 'POST' });
```

### Get Notification List (REST API Fallback)

```javascript
const response = await fetch('/api/v1/notifications/');
const data = await response.json();
console.log(`Unread: ${data.unread_count}, Total: ${data.count}`);
```

## Environment Setup (Dev)

```bash
# 1. Install dependencies
pip install daphne channels channels-redis

# 2. Start Redis (if not running)
redis-server &

# 3. Run Daphne server
daphne -b 0.0.0.0 -p 8000 config.asgi:application

# 4. Open browser
# ws://127.0.0.1:8000/ws/notifications/
```

## Production Deployment

```bash
# 1. Install dependencies
pip install -r requirements-websocket.txt

# 2. Configure Nginx with WebSocket support (see PRODUCTION_DEPLOYMENT.md)

# 3. Run multiple Daphne workers
sudo supervisorctl start daphne:*

# 4. Monitor
sudo journalctl -fu daphne.service
redis-cli MONITOR
```

## Notification Types

| Type | Use Case | Priority |
|------|----------|----------|
| PAYMENT_SUCCESS | Payment received | MEDIUM |
| PAYMENT_FAILED | Payment failed | HIGH |
| SYSTEM_ALERT | Important system message | VARIES |
| CONTENT_PUBLISHED | Content now public | MEDIUM |
| SERMON_UPLOADED | New sermon available | MEDIUM |
| NEW_COMMENT | Someone commented on your post | LOW |
| NEW_REPLY | Someone replied to your comment | LOW |
| DONATION_RECEIVED | You received a donation | HIGH |
| OTHER | Generic notification | MEDIUM |

See `apps/notifications/constants.py` for complete list.

## Fail-Safe Guarantee

✅ If WebSocket fails → Notification still saved to database  
✅ If Redis crashes → Notification still created (API still works)  
✅ If Daphne crashes → Use REST API polling fallback  
✅ User payload is never lost  

## Debugging

### Check WebSocket Connection

```javascript
// Browser console
const ws = new WebSocket('ws://127.0.0.1:8000/ws/notifications/');
ws.onopen = () => console.log('✓ Connected');
ws.onmessage = e => console.log('✓ Message:', JSON.parse(e.data));
ws.onerror = () => console.log('✗ Error');
ws.onclose = e => console.log('✗ Closed:', e.code);
```

### Check Redis

```bash
redis-cli
> PING
> CHANNELS user_*          # See active user groups
> INFO stats               # Connection stats
```

### Check Logs

```bash
# Daphne logs
sudo journalctl -fu daphne.service -n 50

# Django logs (if proxied)
tail -f backend.log | grep WebSocket
```

### Test Notification Creation

```python
from django.contrib.auth import get_user_model
from apps.notifications.services import NotificationService
from apps.notifications.constants import NotificationType

User = get_user_model()
user = User.objects.first()

NotificationService.notify_user(
    user=user,
    notification_type=NotificationType.SYSTEM_ALERT,
    title='Test Notification',
    message='This is a test',
)

# Check if created
from apps.notifications.models import Notification
print(Notification.objects.count())
```

## Performance Tips

- Run 1 Daphne worker per CPU core (4 workers for 4-core CPU)
- Redis should be on same network or local
- Use Redis pipeline for bulk operations
- Increase PostgreSQL connection pool size
- Monitor WebSocket connection count: `ss -s | grep estab`

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| WebSocket won't connect | Not authenticated | Login first, check Django session |
| Close code 4001 | Anonymous user | Must be logged in |
| Messages not arriving | Redis disconnected | Check `redis-cli ping` |
| Web Socket timeout | Firewall blocking | Check ports 80, 443, 8000 |
| High CPU on Daphne | Too few workers | Run more Daphne instances |
| Memory leak | Channel layer not cleaning up | Check Redis MONITOR output |

## File Reference

| File | Purpose |
|------|---------|
| `config/asgi.py` | ASGI entry point with ProtocolTypeRouter |
| `config/settings.py` | CHANNEL_LAYERS and ASGI_APPLICATION config |
| `apps/notifications/consumers.py` | WebSocket consumer logic |
| `apps/notifications/routing.py` | WebSocket URL patterns |
| `apps/notifications/services.py` | NotificationService (updated) |
| `ARCHITECTURE.md` | System design and flow |
| `WEBSOCKET_INTEGRATION.md` | Frontend guide with JS examples |
| `PRODUCTION_DEPLOYMENT.md` | Deployment to production |
| `TESTING_INTEGRATION.md` | Testing and integration guide |

## Time Complexity

- Connection establishment: O(1)
- Sending notification: O(1) sync, but async WebSocket is fire-and-forget
- Group add (per user): O(1) amortized with Redis
- Message delivery: O(number of connected clients per user) = typically 1-5

## API Reference

### NotificationService Methods

```python
# Main method - use this!
NotificationService.notify_user(
    user, notification_type, title, message,
    metadata=None, priority=MEDIUM, source_module=OTHER
) -> Notification | None

# Get notification by user ID
NotificationService.notify_user_by_id(
    user_id, notification_type, title, message, ...
) -> Notification | None

# Pre-formatted payment notifications
NotificationService.format_payment_success(amount, payment_id)
NotificationService.format_payment_failed(amount, payment_id, reason='')

# Legacy async support (optional)
NotificationService.notify_user_async(...) -> Notification | None
```

### REST Endpoints

```
GET  /api/v1/notifications/              List user's notifications
GET  /api/v1/notifications/unread/       List unread only
POST /api/v1/notifications/read/<id>/    Mark one as read
POST /api/v1/notifications/read-all/     Mark all as read
POST /api/v1/notifications/test/         Create test notification (dev)
```

## WebSocket Events

### Server → Client

```json
{
  "id": "uuid",
  "title": "Payment Successful",
  "message": "Your payment was processed",
  "notification_type": "PAYMENT_SUCCESS",
  "priority": "HIGH",
  "source_module": "PAYMENTS",
  "is_read": false,
  "created_at": "2024-01-15T10:30:00Z",
  "metadata": { "payment_id": "..." }
}
```

### Client → Server (Optional)

```json
{ "type": "ping" }  // Keep-alive
```

## License & Support

This implementation follows Django best practices and is compatible with:
- Django 5.x
- Python 3.8+
- PostgreSQL/SQLite
- Redis 6.0+
- Daphne 4.0+
- Channels 4.0+

For detailed documentation, see:
- ARCHITECTURE.md - System design
- WEBSOCKET_INTEGRATION.md - Frontend guide
- PRODUCTION_DEPLOYMENT.md - Deployment steps
- TESTING_INTEGRATION.md - Testing guide
