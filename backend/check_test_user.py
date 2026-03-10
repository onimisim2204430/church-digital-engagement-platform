"""Check existing users and create a test user if needed."""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import User

print("\n" + "="*60)
print("EXISTING USERS")
print("="*60)

users = User.objects.all()[:5]
for user in users:
    print(f"\nEmail: {user.email}")
    print(f"  ID: {user.id}")
    print(f"  Is Active: {user.is_active}")
    print(f"  Email Verified: {user.email_verified}")

# Create or get test user
print("\n" + "="*60)
print("CREATE/GET TEST USER")
print("="*60)

test_email = "test@notifications.com"
test_password = "NotificationTest123!"

user, created = User.objects.get_or_create(
    email=test_email,
    defaults={
        'first_name': 'Test',
        'last_name': 'User',
        'is_active': True,
        'email_verified': True,
    }
)

if created:
    user.set_password(test_password)
    user.save()
    print(f"✓ Created new test user: {test_email}")
else:
    # Update password to ensure it's known
    user.set_password(test_password)
    user.is_active = True
    user.email_verified = True
    user.save()
    print(f"✓ Retrieved existing test user: {test_email}")
    print(f"  Password updated to: {test_password}")

print(f"\n✓ Test user ready!")
print(f"  Email: {test_email}")
print(f"  Password: {test_password}")
print(f"  ID: {user.id}")
