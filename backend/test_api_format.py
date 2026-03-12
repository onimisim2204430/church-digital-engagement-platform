#!/usr/bin/env python
"""Test notification API response format"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
import json

User = get_user_model()
client = APIClient()

# Get user and generate token
user = User.objects.get(email='joelsam@church.com')
refresh = RefreshToken.for_user(user)
access_token = str(refresh.access_token)

print(f'=== Testing for: {user.email} ===\n')

# Set auth header
client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')

# Test unread notifications endpoint
response = client.get('/api/v1/notifications/unread/')

print(f'Status Code: {response.status_code}\n')

if response.status_code == 200:
    data = response.json()
    print('=== RAW RESPONSE ===')
    print(json.dumps(data, indent=2))
    print()
    
    print('=== STRUCTURE ANALYSIS ===')
    print(f'Top-level keys: {list(data.keys())}')
    
    if 'results' in data:
        print(f'Results type: {type(data["results"])}')
        print(f'Results count: {len(data["results"]) if isinstance(data["results"], list) else "N/A"}')
        if isinstance(data["results"], dict) and 'results' in data["results"]:
            print(f'Nested results: {len(data["results"]["results"])} items')
    
    print(f'\nUnread count field: {data.get("unread_count", "NOT FOUND")}')
    
else:
    print(f'ERROR: {response.content}')
