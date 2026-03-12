#!/usr/bin/env python
import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from apps.content.models import PostContentType
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
print("TESTING POST WITH SERIES ATTACHMENT")
print("="*80)

# Get available series
response = requests.get('http://localhost:8000/api/v1/admin/series/', headers=headers)
series_data = response.json()
available_series = series_data.get('results', []) if isinstance(series_data, dict) else series_data

if available_series:
    series_id = available_series[0]['id']
    print(f"\nUsing series: {available_series[0]['title']} (ID: {series_id})")
    
    # Get a real content type
    content_type = PostContentType.objects.filter(is_enabled=True).first()
    if not content_type:
        content_type = PostContentType.objects.first()
    
    if not content_type:
        print("ERROR: No content types found in database")
    else:
        print(f"Using content type: {content_type.name} (ID: {content_type.id})")
        
        # Create a post with series
        post_data = {
            'title': f'Test Post with Series - {int(__import__("time").time())}',
            'content': 'This is a test post attached to a series',
            'content_type': str(content_type.id),
            'status': 'DRAFT',
            'series': series_id,
            'series_order': 1
        }
        
        print(f"\nCreating post with series data:")
        print(json.dumps(post_data, indent=2))
        
        response = requests.post('http://localhost:8000/api/v1/admin/content/posts/', 
                                json=post_data, headers=headers)
        
        print(f"\nResponse Status: {response.status_code}")
        if response.status_code in [200, 201]:
            created = response.json()
            print(f"\nResponse Type: {type(created)}")
            if isinstance(created, dict):
                print(f"Response keys: {list(created.keys())}")
                print(f"\nCreated Post:")
                print(f"  ID: {created.get('id')}")
                print(f"  Title: {created.get('title')}")
                print(f"  Series: {created.get('series')}")
                print(f"  Series Title: {created.get('series_title')}")
                print(f"  Series Order: {created.get('series_order')}")
            else:
                print(f"Unexpected response type: {created}")
        else:
            print(f"Error Response:")
            print(response.text)
        
        # Now try to GET the post to verify
        if response.status_code in [200, 201]:
            post_id = created.get('id')
            print(f"\nFetching created post (ID: {post_id}):")
            
            response = requests.get(f'http://localhost:8000/api/v1/admin/content/posts/{post_id}/', 
                                   headers=headers)
            
            if response.status_code == 200:
                post = response.json()
                print(f"  Series: {post.get('series')}")
                print(f"  Series Title: {post.get('series_title')}")
                print(f"  Series Order: {post.get('series_order')}")
            else:
                print(f"Error: {response.text}")
else:
    print("\nNo series available to test with")

print("\n" + "="*80)
