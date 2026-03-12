#!/usr/bin/env python
"""Check unread notifications for user"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.notifications.models import Notification
from django.contrib.auth import get_user_model

User = get_user_model()

# Find user
user = User.objects.get(email='joelsam@church.com')

print('=== UNREAD NOTIFICATIONS ===')
unread = Notification.objects.filter(user=user, is_read=False).order_by('-created_at')
print(f'Total unread: {unread.count()}')
print()

for n in unread[:5]:
    print(f'ID: {n.id}')
    print(f'Title: {n.title}')
    print(f'Message: {n.message}')
    print(f'Type: {n.notification_type}')
    print(f'Created: {n.created_at}')
    print('-' * 50)
