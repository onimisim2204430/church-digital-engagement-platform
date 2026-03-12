#!/usr/bin/env python
"""Check which user has unread notifications"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.notifications.models import Notification
from django.contrib.auth import get_user_model

User = get_user_model()

print('=== USERS WITH UNREAD NOTIFICATIONS ===\n')

users_with_notifs = Notification.objects.filter(is_read=False).values_list('user__email', flat=True).distinct()

for email in users_with_notifs:
    user = User.objects.get(email=email)
    unread = Notification.objects.filter(user=user, is_read=False).order_by('-created_at')
    print(f'{email}: {unread.count()} unread notifications')
    for n in unread[:3]:
        print(f'  ├─ {n.title} ({n.notification_type})')
    print()
