#!/usr/bin/env python
import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from apps.content.models import PostContentType, Post
import requests

User = get_user_model()
admin = User.objects.get(email='joelsam@church.com')

refresh = RefreshToken.for_user(admin)
access_token = str(refresh.access_token)

headers = {
    'Authorization': f'Bearer {access_token}',
    'Content-Type': 'application/json'
}

print("\n" + "="*80)
print("DEBUG: PATCH POST WITH SERIES")
print("="*80)

# Get a post and series to test with
response = requests.get('http://localhost:8000/api/v1/admin/content/posts/', headers=headers)
posts_data = response.json()
posts = posts_data.get('results', []) if isinstance(posts_data, dict) else posts_data

response = requests.get('http://localhost:8000/api/v1/admin/series/', headers=headers)
series_data = response.json()
series_list = series_data.get('results', []) if isinstance(series_data, dict) else series_data

if posts and series_list:
    post = posts[0]
    series = series_list[0]
    post_id = post['id']
    series_id = series['id']
    
    print(f"\nPost: {post['title'][:50]}...")
    print(f"Series: {series['title']}")
    
    # Try to update with series
    update_data = {
        'series': series_id,
        'series_order': 99
    }
    
    print(f"\nSending PATCH with data:")
    print(json.dumps(update_data, indent=2))
    
    response = requests.patch(f'http://localhost:8000/api/v1/admin/content/posts/{post_id}/', 
                             json=update_data, headers=headers)
    
    print(f"\nResponse Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"\nResponse (full):")
        print(json.dumps({
            'id': result.get('id'),
            'series': result.get('series'),
            'series_title': result.get('series_title'),
            'series_order': result.get('series_order')
        }, indent=2))
        
        # Now GET the post to verify
        response = requests.get(f'http://localhost:8000/api/v1/admin/content/posts/{post_id}/', 
                               headers=headers)
        
        if response.status_code == 200:
            post = response.json()
            print(f"\nGET verification:")
            print(json.dumps({
                'series': post.get('series'),
                'series_title': post.get('series_title'),
                'series_order': post.get('series_order')
            }, indent=2))
    else:
        print(f"Error: {response.text}")

print("\n" + "="*80)
