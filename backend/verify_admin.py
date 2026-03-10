"""
Step 4: Verify Django Admin interface for notifications.
This script checks admin registration and provides access instructions.
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib import admin
from apps.notifications.models import Notification
from apps.users.models import User

print("\n" + "="*60)
print("STEP 4: DJANGO ADMIN VERIFICATION")
print("="*60)

# Check if Notification model is registered in admin
if Notification in admin.site._registry:
    print("\n✓ Notification model IS registered in Django Admin")
    
    admin_class = admin.site._registry[Notification]
    print(f"\nAdmin Class: {admin_class.__class__.__name__}")
    
    if hasattr(admin_class, 'list_display'):
        print(f"\nList Display Fields: {admin_class.list_display}")
    
    if hasattr(admin_class, 'list_filter'):
        print(f"\nList Filters: {admin_class.list_filter}")
    
    if hasattr(admin_class, 'search_fields'):
        print(f"\nSearch Fields: {admin_class.search_fields}")
    
    if hasattr(admin_class, 'actions'):
        print(f"\nCustom Actions: {[action.__name__ for action in admin_class.actions if callable(action)]}")
else:
    print("\n✗ Notification model is NOT registered in Django Admin")

# Check notification count
notification_count = Notification.objects.count()
print(f"\n✓ Total Notifications in Database: {notification_count}")

# Check for superuser
superusers = User.objects.filter(is_superuser=True, is_active=True)
print(f"\n✓ Active Superusers: {superusers.count()}")
for su in superusers:
    print(f"  - {su.email}")

print("\n" + "="*60)
print("ADMIN ACCESS INSTRUCTIONS")
print("="*60)
print("\n1. Django admin is running at: http://127.0.0.1:8000/django-admin/")
print("\n2. Login with a superuser account")
print("\n3. Navigate to: APPS > Notifications > Notifications")
print("\n4. You should see:")
print("   - List of all notifications")
print("   - Filters: Type, Priority, Source Module, Is Read, Created At")
print("   - Search by: User email, Title, Message")
print("   - Bulk Action: 'Mark selected as read'")
print("\n5. Test the admin interface:")
print("   ✓ View notification list")
print("   ✓ Filter by type/priority/source")
print("   ✓ Search for specific notifications")
print("   ✓ Select notifications and use 'Mark selected as read' action")
print("   ✓ Click on a notification to view details")

print("\n" + "="*60)
print("STEP 4: READY FOR MANUAL VERIFICATION")
print("="*60)
print("\nPlease open your browser and test the admin interface manually.")
print("Once verified, we can proceed to Step 5: Fail-Safe Testing")
