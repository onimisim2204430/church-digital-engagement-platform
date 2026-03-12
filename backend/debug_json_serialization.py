#!/usr/bin/env python
"""Debug: Check how APIClient serializes JSON"""
import os
import sys
import django
import json
import hmac
import hashlib

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from rest_framework.test import APIRequestFactory
from rest_framework.renderers import JSONRenderer
from rest_framework.parsers import JSONParser

# Get webhook secret
webhook_secret = os.environ.get('PAYSTACK_WEBHOOK_SECRET')

payload = {
    "event": "charge.success",
    "data": {
        "reference": "PAY_TEST_789",
        "amount": 50000,
        "status": "success"
    }
}

# Method 1: Standard JSON encoding (how we generate signature)
method1_bytes = json.dumps(payload).encode('utf-8')
sig1 = hmac.new(webhook_secret.encode('utf-8'), method1_bytes, hashlib.sha512).hexdigest()

# Method 2: With sort_keys (consistent ordering)
method2_bytes = json.dumps(payload, sort_keys=True).encode('utf-8')
sig2 = hmac.new(webhook_secret.encode('utf-8'), method2_bytes, hashlib.sha512).hexdigest()

# Method 3: Minimal (no whitespace)
method3_bytes = json.dumps(payload, separators=(',', ':')).encode('utf-8')
sig3 = hmac.new(webhook_secret.encode('utf-8'), method3_bytes, hashlib.sha512).hexdigest()

print("Payload serialization comparison:")
print(f"\nMethod 1 (default json.dumps):")
print(f"  Bytes length: {len(method1_bytes)}")
print(f"  Bytes: {method1_bytes[:80]}")
print(f"  Signature: {sig1[:40]}")

print(f"\nMethod 2 (with sort_keys=True):")
print(f"  Bytes length: {len(method2_bytes)}")
print(f"  Bytes: {method2_bytes[:80]}")
print(f"  Signature: {sig2[:40]}")

print(f"\nMethod 3 (minimal whitespace):")
print(f"  Bytes length: {len(method3_bytes)}")
print(f"  Bytes: {method3_bytes[:80]}")
print(f"  Signature: {sig3[:40]}")

# Try with Django test client
print("\n" + "="*80)
print("Testing with APIClient:")

from rest_framework.test import APIClient
import io

client = APIClient()

# Use POST with JSON
payload_json = json.dumps(payload)

# Create a request manually to get raw body
factory = APIRequestFactory()
request = factory.post(
    '/test/',
    data=payload_json,
    content_type='application/json'
)

print(f"\nAPIClient request body:")
print(f"  Type: {type(request.body)}")
print(f"  Length: {len(request.body)}")
print(f"  Content: {request.body[:100]}")

# Generate signature for the actual request body
actual_sig = hmac.new(webhook_secret.encode('utf-8'), request.body, hashlib.sha512).hexdigest()
print(f"  Signature: {actual_sig[:40]}")
