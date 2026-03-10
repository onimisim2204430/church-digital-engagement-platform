#!/usr/bin/env python
"""Test admin payment transactions endpoint"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()
client = APIClient()

# Test with admin user
admin = User.objects.filter(role='ADMIN', is_staff=True).first()
if not admin:
    print("No admin user found. Creating one...")
    admin = User.objects.filter(is_superuser=True).first()

if admin:
    print(f'=== Testing with ADMIN: {admin.email} ===\n')
    refresh = RefreshToken.for_user(admin)
    access_token = str(refresh.access_token)
    
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
    
    # Test admin transactions endpoint
    response = client.get('/api/v1/payments/admin/transactions/')
    print(f'Status Code: {response.status_code}')
    
    if response.status_code == 200:
        data = response.json()
        print(f'Total Transactions: {data.get("count", 0)}')
        print(f'\nFirst 3 transactions:')
        for tx in data.get('results', [])[:3]:
            print(f'  - {tx.get("user_name")} ({tx.get("user_email")})')
            print(f'    Amount: {tx.get("amount")/100} {tx.get("currency")}')
            print(f'    Status: {tx.get("status")} | Reference: {tx.get("reference")}')
            print()
    else:
        print(f'Error: {response.json()}')
        
    # Test with moderator (should fail)
    print('\n=== Testing with MODERATOR (should fail) ===\n')
    moderator = User.objects.filter(role='MODERATOR').first()
    if moderator:
        refresh = RefreshToken.for_user(moderator)
        access_token = str(refresh.access_token)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        
        response = client.get('/api/v1/payments/admin/transactions/')
        print(f'Status Code: {response.status_code} (Expected 403)')
        print(f'Response: {response.json()}')
    else:
        print('No moderator user found to test')
else:
    print('No admin user found')
