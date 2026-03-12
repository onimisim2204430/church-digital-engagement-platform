#!/usr/bin/env python
"""Direct test of payment initialization"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

# Now test the view directly
from rest_framework.test import APIClient

client = APIClient()

response = client.post(
    '/api/v1/payments/initialize/',
    {'email': 'test@example.com', 'amount': 50000},
    format='json'
)

print(f"Status: {response.status_code}")
print(f"Response: {response.data if hasattr(response, 'data') else response.content}")

if response.status_code >= 400:
    print("\n--- Full response content ---")
    print(response.content[:1000])
