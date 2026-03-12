#!/usr/bin/env python
import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
import requests

User = get_user_model()

print("\n" + "="*80)
print("TESTING SERIES API")
print("="*80)

# Get admin user
admin_user = User.objects.get(email='joelsam@church.com')
refresh = RefreshToken.for_user(admin_user)
access_token = str(refresh.access_token)

headers = {
    'Authorization': f'Bearer {access_token}',
    'Content-Type': 'application/json'
}

print(f"\nLogged in as: {admin_user.email} ({admin_user.first_name} {admin_user.last_name})")
print(f"Role: {admin_user.role}")
print(f"Admin: {admin_user.is_admin}\n")

# Test 1: GET all series
print("\n[TEST 1] GET /api/v1/admin/series/")
response = requests.get('http://localhost:8000/api/v1/admin/series/', headers=headers)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    if isinstance(data, dict) and 'results' in data:
        count = len(data['results'])
        print(f"Series count: {count}")
        for i, series in enumerate(data['results'][:2], 1):
            print(f"  {i}. {series['title']} (ID: {series['id'][:8]}...)")
    elif isinstance(data, list):
        print(f"Series count: {len(data)}")
        for i, series in enumerate(data[:2], 1):
            print(f"  {i}. {series['title']} (ID: {series['id'][:8]}...)")
    else:
        print(f"Response type: {type(data)}")
else:
    print(f"Error: {response.text}")

# Test 2: POST create a new series
print("\n[TEST 2] POST /api/v1/admin/series/ (Create)")
import time
create_data = {
    "title": f"Test Series {int(time.time())}",
    "description": "This is a test series",
    "visibility": "PUBLIC",
    "is_featured": False,
    "featured_priority": 0
}
response = requests.post('http://localhost:8000/api/v1/admin/series/', json=create_data, headers=headers)
print(f"Status: {response.status_code}")
if response.status_code in [200, 201]:
    data = response.json()
    print(f"Response keys: {list(data.keys())}")
    print(f"Full response: {json.dumps(data, indent=2)[:200]}")
    series_id = data.get('id') or data.get('ID')
    if series_id:
        print(f"Created: {data.get('title', data.get('name', 'UNKNOWN'))} (ID: {str(series_id)[:8]}...)")
        print(f"Author: {data.get('author_name', data.get('author', 'UNKNOWN'))}")
else:
    print(f"Error: {response.text}")

# Test 3: GET again to verify
print("\n[TEST 3] GET /api/v1/admin/series/ (Verify)")
response = requests.get('http://localhost:8000/api/v1/admin/series/', headers=headers)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    if isinstance(data, dict) and 'results' in data:
        count = len(data['results'])
    elif isinstance(data, list):
        count = len(data)
    else:
        count = 0
    print(f"Total series now: {count}")

print("\n" + "="*80)
print("EXPECTED BEHAVIOR:")
print("- Test 1: Status 200, should show 4+ series")
print("- Test 2: Status 201, new series created")  
print("- Test 3: Status 200, count should increase by 1")
print("="*80)
