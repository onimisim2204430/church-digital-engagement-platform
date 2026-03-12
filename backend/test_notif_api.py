#!/usr/bin/env python
"""Test notification API endpoint"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()
client = APIClient()

# Get user and generate token
user = User.objects.get(email='joelsam@church.com')
refresh = RefreshToken.for_user(user)
access_token = str(refresh.access_token)

print(f'=== Testing API for: {user.email} ===')
print(f'Token: {access_token[:20]}...')
print()

# Set auth header
client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')

# Test unread notifications endpoint
print('=== GET /api/v1/notifications/unread/ ===')
response = client.get('/api/v1/notifications/unread/')
print(f'Status: {response.status_code}')
print(f'Headers: {dict(response.headers)}')

if response.status_code == 200:
    data = response.json()
    print(f'\nResponse Data:')
    print(f'  Status: {data.get("status")}')
    print(f'  Count: {data.get("count")}')
    print(f'  Unread Count: {data.get("unread_count")}')
    print(f'  Results: {len(data.get("results", []))} items')
    print()
    for notif in data.get('results', [])[:3]:
        print(f'  - {notif.get("title")} | {notif.get("notification_type")}')
else:
    print(f'Error: {response.content}')
