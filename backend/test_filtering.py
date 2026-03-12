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
print("TESTING SERIES FILTERING BY USER ROLE")
print("="*80)

# Test users
users_to_test = [
    ('joelsam@church.com', 'ADMIN'),
    ('Smithgeorge@church.com', 'MODERATOR'),
]

for email, expected_role in users_to_test:
    user = User.objects.get(email=email)
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    print(f"\n{'='*70}")
    print(f"User: {user.email}")
    print(f"Name: {user.first_name} {user.last_name}")
    print(f"Role: {user.role}")
    print(f"Is Admin: {user.is_admin}")
    print(f"{'='*70}")
    
    # Get series for this user
    response = requests.get('http://localhost:8000/api/v1/admin/series/', headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        if isinstance(data, dict) and 'results' in data:
            series_list = data['results']
            print(f"\n[OK] API Response Status: 200 OK")
            print(f"[OK] Series returned: {len(series_list)}")
        elif isinstance(data, list):
            series_list = data
            print(f"\n[OK] API Response Status: 200 OK")
            print(f"[OK] Series returned: {len(series_list)}")
        else:
            print(f"\n[ERROR] Unexpected response format: {type(data)}")
            series_list = []
        
        if series_list:
            print(f"\nSeries visible to this user:")
            for series in series_list[:5]:
                author_name = series.get('author_name', 'UNKNOWN')
                author_id = series.get('author', 'UNKNOWN')[:8]
                title = series.get('title', 'NO TITLE')
                print(f"  - {title}")
                print(f"    Author: {author_name} (ID: {author_id}...)")
        else:
            print(f"\n[NO DATA] No series returned")
    else:
        print(f"\n[ERROR] API Error: Status {response.status_code}")
        print(f"   Error: {response.text}")

print("\n" + "="*80)
print("EXPECTED BEHAVIOR:")
print("- ADMIN: Should see ALL series (including other users')")
print("- MODERATOR: Should see ONLY their own series")
print("="*80 + "\n")
