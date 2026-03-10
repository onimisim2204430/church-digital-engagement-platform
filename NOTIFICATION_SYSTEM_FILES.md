# Notification + Email System — File Map
**For the lead engineer. Every file that participates in the role/permission update → in-app notification + email pipeline.**

---

## Flow at a Glance

```
Admin saves role/permission change
        │
        ▼
backend/apps/users/views.py          ← TRIGGER POINT
  _enqueue_member_update_alert()
  transaction.on_commit(_send)
        │
        ├──► NotificationService.notify_user_async()   ← non-blocking
        │           │
        │           ▼
        │    apps/notifications/tasks.py               ← Celery task enqueued
        │           │
        │    [Celery worker picks up]
        │           ▼
        │    apps/notifications/services.py            ← creates DB record + WS push
        │           │
        │           ├──► apps/notifications/models.py  ← Notification row written
        │           └──► apps/notifications/consumers.py  ← WebSocket push via Redis
        │
        └──► EmailService.send_email(async_send=True)  ← non-blocking
                    │
                    ▼
             apps/email/tasks.py                       ← Celery email task enqueued
                    │
             [Celery worker picks up]
                    ▼
             apps/email/services.py                    ← renders template, sends SMTP
                    │
                    ▼
             apps/email/providers/smtp.py              ← actual SMTP delivery
```

---

## Backend Files

### 1. `backend/apps/users/views.py`
**Role:** Trigger point. Contains `_enqueue_member_update_alert()` — the function
called after every role change or permission update. It builds the diff, calls
`NotificationService.notify_user_async()` and `EmailService.send_email()` inside
`transaction.on_commit()` so both side-effects fire only after the DB commit. Uses
`.async_send=True` and `notify_user_async` to hand off to Celery immediately without
blocking the HTTP response.

### 2. `backend/apps/notifications/constants.py`
**Role:** Enum definitions. Defines `NotificationType` (including `ROLE_UPDATED`,
`PERMISSIONS_UPDATED`), `NotificationPriority`, and `SourceModule`. Every layer
(views, services, tasks) imports from here to agree on the same string values.
Adding a new event type starts here.

### 3. `backend/apps/notifications/models.py`
**Role:** Database schema. Defines the `Notification` model — the permanent record
written for every notification. Fields: `user`, `notification_type`, `title`,
`message`, `metadata` (JSON), `is_read`, `priority`, `source_module`, `created_at`.
The REST API and member dashboard read from this table.

### 4. `backend/apps/notifications/managers.py`
**Role:** Custom queryset manager for `Notification`. Provides
`create_notification()` (used by `NotificationService`) and queryset helpers
like `unread_for_user()`. Keeps model-layer query logic out of the service layer.

### 5. `backend/apps/notifications/services.py`
**Role:** Orchestration layer. `NotificationService.notify_user()` creates the DB
record via the manager, then calls `_send_websocket_notification()` to push the
event to the user's Redis channel group. `notify_user_async()` skips the inline
work and enqueues `create_notification_task` to Celery instead. `notify_user_by_id`
is the variant used by the Celery task (accepts a string ID rather than a live ORM
object, because ORM objects are not serializable across worker boundaries).

### 6. `backend/apps/notifications/tasks.py`
**Role:** Celery task definition. `create_notification_task` is the async entry
point. It receives a plain dict payload from the queue, looks up the user by ID,
and delegates back to `NotificationService.notify_user_by_id()`. Registered in the
worker as `apps.notifications.tasks.create_notification_task` — you can see it fire
in the Celery console on every role save.

### 7. `backend/apps/notifications/consumers.py`
**Role:** WebSocket server-side handler. `NotificationConsumer` (AsyncWebsocketConsumer)
manages the lifecycle of each browser WebSocket connection. On connect it joins the
group `user_{user_id}` on Redis. `send_notification()` is the Channels event handler
— when `services.py` calls `channel_layer.group_send(group, event)`, Channels routes
it here, and this method forwards it to the client over the open socket.

### 8. `backend/apps/notifications/routing.py`
**Role:** WebSocket URL router. Maps `ws/notifications/` to `NotificationConsumer`.
Imported by `config/asgi.py` to wire into the ASGI protocol router.

### 9. `backend/apps/notifications/jwt_middleware.py`
**Role:** WebSocket authentication. Extracts the `?token=` query-string JWT from the
WebSocket handshake request, validates it with SimpleJWT, and injects the resolved
Django `User` into the ASGI scope. Without this, Channels would see `AnonymousUser`
and reject the connection.

### 10. `backend/apps/notifications/views.py`
**Role:** REST API for the notification inbox. Exposes endpoints:
`GET /notifications/unread/`, `PATCH /notifications/{id}/read/`,
`POST /notifications/mark-all-read/`. The frontend polls these on mount and when the
bell is opened. Also the fallback path when WebSocket is unavailable.

### 11. `backend/apps/notifications/urls.py`
**Role:** URL configuration for the notification REST endpoints. Included by the
project's main `config/urls.py` under the `/api/v1/notifications/` prefix.

### 12. `backend/apps/notifications/serializers.py`
**Role:** DRF serializers for the REST API. Shapes the `Notification` model into
the JSON the frontend expects (`id`, `title`, `message`, `notification_type`,
`is_read`, `metadata`, `created_at`, etc.).

### 13. `backend/apps/notifications/signals.py`
**Role:** Django signals. Listens for `post_save` on `Notification` (and possibly
`ModeratorPermission`) to trigger cache invalidation or additional side-effects
without coupling the model to the service layer.

### 14. `backend/config/asgi.py`
**Role:** ASGI entry point. Wires HTTP and WebSocket protocols together.
`ProtocolTypeRouter` sends HTTP to Django's ASGI app and WebSocket connections
through `AllowedHostsOriginValidator → JWTAuthMiddleware → AuthMiddlewareStack →
URLRouter(websocket_urlpatterns)`. This file is why `runserver` with `daphne` first
in `INSTALLED_APPS` supports live WebSocket connections.

### 15. `backend/config/celery.py`
**Role:** Celery application setup. Defines the `church_platform` Celery app,
sets the broker/result backend to Redis, and calls `autodiscover_tasks()`. This is
why `create_notification_task` and `send_email_task` appear in the worker's `[tasks]`
list automatically — no manual registration needed.

---

## Email Files

### 16. `backend/apps/email/services.py`
**Role:** Email orchestration. `EmailService.send_email()` creates an `EmailMessage`
DB record (status `QUEUED`) and, when `async_send=True` (the default), calls
`send_email_task.delay(message_id)` to hand off to Celery. The actual SMTP connect
happens in the worker, not in the request thread. The `notification` template slug
used by role-update emails is resolved here via `template_engine.py`.

### 17. `backend/apps/email/tasks.py`
**Role:** Celery task for email delivery. `send_email_task` receives the
`EmailMessage.id`, re-hydrates it from DB, renders the template, and calls the
configured provider. Visible in the Celery console as `email.send_email_task`.

### 18. `backend/apps/email/constants.py`
**Role:** Email type enums. Defines `EmailType` (`NOTIFICATION`, `TRANSACTIONAL`,
etc.) used by `views.py` when calling `EmailService.send_email()`.

### 19. `backend/apps/email/models.py`
**Role:** `EmailMessage` and `EmailTemplate` DB models. Tracks every outbound email
with its status (`QUEUED → SENDING → SENT/FAILED`), recipient, template used, and
rendered context. Enables the email audit trail visible in Django admin.

### 20. `backend/apps/email/template_engine.py`
**Role:** Renders the HTML/text email from a stored `EmailTemplate` (looked up by
`template_slug='notification'`) and the context dict passed by `views.py` (user
name, notification title, body, action URL).

### 21. `backend/apps/email/providers/smtp.py`
**Role:** Concrete SMTP provider. Accepts the rendered message and delivers it via
Django's `EmailMultiAlternatives` over the SMTP settings from `.env`
(`smtp.gmail.com:587`, TLS). This is the final hop before the email leaves the
server.

### 22. `backend/apps/email/providers/manager.py`
**Role:** Provider registry/circuit-breaker. Selects the active email provider
(SMTP vs SendGrid) and implements retry/fallback logic so a transient SMTP failure
doesn't permanently block delivery.

---

## Frontend Files

### 23. `src/hooks/useNotificationWebSocket.ts`
**Role:** WebSocket client hook. Opens `ws://backend/ws/notifications/?token=<JWT>`,
handles reconnection with exponential back-off, and fires `onNotification(data)`
for every message. Used by `MemberTopBar`. This is the real-time path — when
`NotificationConsumer.send_notification()` fires on the server, the event arrives
here within milliseconds.

### 24. `src/services/notification.service.ts`
**Role:** REST API client for notifications. `getUnreadNotifications()` fetches the
`/api/v1/notifications/unread/` endpoint. `markAsRead()` patches a single record.
Used by `MemberTopBar` on mount and on bell-open as the fallback/initial-load path
when WebSocket has not yet delivered new items.

### 25. `src/member/layouts/MemberTopBar.tsx`
**Role:** The component that renders the bell icon, badge count, and dropdown list
in the member dashboard header. Wires both paths together: calls
`fetchNotifications()` (REST) on mount, and registers `handleWebSocketNotification`
with `useNotificationWebSocket` to prepend new arrivals and increment the badge in
real-time without a page refresh. The toast notification on role-change also fires
from here.

---

## Configuration / Infrastructure

### 26. `backend/config/settings.py`
**Relevant sections:** `INSTALLED_APPS` (`daphne` first → enables ASGI WebSocket
on `runserver`), `CHANNEL_LAYERS` (Redis channel layer config for group messaging),
`CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` (Redis), `CELERY_BEAT_SCHEDULE`
(autopublish; email health-check tasks), `EMAIL_BACKEND` / SMTP settings.

---

## How the Files Connect End-to-End

```
[Admin clicks Save in RolesTab]
        │  HTTP PATCH
        ▼
users/views.py  ──on_commit──►  notifications/tasks.py  (Celery queue: Redis)
                 └──on_commit──►  email/tasks.py         (Celery queue: Redis)

[HTTP response returns INSTANTLY — no blocking]

[Celery worker — visible in PowerShell terminal]
        ├── create_notification_task
        │       ▼
        │   notifications/services.py
        │       ├── notifications/models.py   (write DB row)
        │       └── notifications/consumers.py (group_send → Redis channel)
        │                   │  WebSocket frame
        │                   ▼
        │           hooks/useNotificationWebSocket.ts
        │                   │
        │                   ▼
        │           MemberTopBar.tsx  ← badge +1 & toast appear in real-time
        │
        └── send_email_task
                ▼
            email/services.py
                ▼
            email/template_engine.py  (renders 'notification' template)
                ▼
            email/providers/smtp.py   (SMTP delivery)
```

---

## Why It Was Slow (Root Cause — Now Fixed)

`users/views.py` previously called `NotificationService.notify_user()` (synchronous),
which called `async_to_sync(channel_layer.group_send)` — a blocking Redis call — inside
the HTTP thread. In a Daphne (ASGI) server, wrapping async inside sync from within a
request context causes event-loop contention: the thread waits for async I/O to complete
before returning the response, adding 3–7 s of latency.

**Fix applied:** Changed to `notify_user_async()` which calls
`create_notification_task.delay()` — a single non-blocking Redis enqueue
(< 5 ms). Response returns immediately. The Celery worker handles every downstream
step asynchronously.

---

## Debugging Checklist

| Symptom | Where to look |
|---|---|
| Save is still slow | `users/views.py` — confirm `notify_user_async` not `notify_user` |
| Notification not in DB | `notifications/tasks.py` — check Celery console for task failure |
| WebSocket not connecting | `config/asgi.py`, `notifications/jwt_middleware.py`, browser DevTools WS tab |
| Badge not updating in real-time | `hooks/useNotificationWebSocket.ts` — check console for `[TopBar] WebSocket connected` |
| Email not arriving | `email/tasks.py` in Celery, `EmailMessage` records in Django admin |
| "Invalid notification_type" | `notifications/constants.py` — add the type to `NotificationType` |
