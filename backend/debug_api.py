#!/usr/bin/env python
"""Debug API response"""
import requests
import json

response = requests.post(
    'http://localhost:8000/api/v1/payments/initialize/',
    json={'email': 'test@test.com', 'amount': 50000},
    timeout=10
)

print(f'Status: {response.status_code}')
print(f'Content Type: {response.headers.get("content-type")}')
print(f'Content Length: {len(response.text)}')
print(f'Response: {response.text[:800]}')
