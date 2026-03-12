"""Test script to verify notifications system works."""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.notifications.services import NotificationService
from apps.notifications.constants import NotificationType, SourceModule
from apps.notifications.models import Notification

print("=" * 80)
print("STEP 2: Testing Notification Creation")
print("=" * 80)

User = get_user_model()
user = User.objects.first()

if not user:
    print("❌ No users found. Creating test user...")
    user = User.objects.create_user(
        email='test@notification.com',
        password='TestPass123!',
        first_name='Test',
        last_name='User'
    )
    print(f"✓ Created test user: {user.email}")
else:
    print(f"✓ Using existing user: {user.email}")

print("\n→ Creating test notification...")
notification = NotificationService.notify_user(
    user=user,
    notification_type=NotificationType.SYSTEM_ALERT,
    title="Test Notification",
    message="This is a system test notification created from Django shell script.",
    source_module=SourceModule.SYSTEM,
)

if notification:
    print(f"✓ Notification created successfully!")
    print(f"  - ID: {notification.id}")
    print(f"  - Type: {notification.notification_type}")
    print(f"  - Title: {notification.title}")
    print(f"  - Message: {notification.message}")
    print(f"  - Is Read: {notification.is_read}")
    print(f"  - Created: {notification.created_at}")
else:
    print("❌ Failed to create notification")

print("\n→ Querying all notifications from database...")
all_notifications = Notification.objects.all()
print(f"✓ Total notifications in DB: {all_notifications.count()}")

if all_notifications.exists():
    print("\n→ Recent notifications:")
    for notif in all_notifications[:5]:
        print(f"  - [{notif.notification_type}] {notif.title} (Read: {notif.is_read})")

print("\n→ Testing fail-safe behavior...")
print("  Attempting to create notification with invalid type...")
bad_notification = NotificationService.notify_user(
    user=user,
    notification_type='INVALID_TYPE_TEST',
    title="This should fail gracefully",
    message="Testing fail-safe behavior",
)

if bad_notification is None:
    print("✓ Fail-safe works! Invalid notification returned None without crashing")
else:
    print("❌ Unexpected: notification was created with invalid type")

print("\n" + "=" * 80)
print("STEP 2: COMPLETE ✓")
print("=" * 80)
