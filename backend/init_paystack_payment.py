#!/usr/bin/env python
"""
Real Paystack Sandbox Payment Initialization
Uses Django test client to avoid external network issues
"""
import os
import sys
import django
import json
import uuid

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from rest_framework.test import APIClient

print("\n" + "="*80)
print("REAL PAYSTACK SANDBOX PAYMENT TEST")
print("="*80)

# Initialize payment
email = f"test.paystack{uuid.uuid4().hex[:4]}@example.com"
amount = 50000  # 500 NGN

print(f"\n→ Initializing payment...")
print(f"  Email: {email}")
print(f"  Amount: {amount/100} NGN")

try:
    client = APIClient()
    response = client.post(
        '/api/v1/payments/initialize/',
        {'email': email, 'amount': amount},
        format='json'
    )
    
    if response.status_code not in (200, 201):
        print(f"ERROR: Got status {response.status_code}")
        print(f"Response: {response.data if hasattr(response, 'data') else response.content.decode()[:500]}")
        sys.exit(1)
    
    data = response.data if hasattr(response, 'data') else response.json()
    
    auth_url = data.get('authorization_url')
    ref = data.get('reference')
    
    print(f"\n✅ PAYMENT INITIALIZED!")
    print(f"\nReference: {ref}")
    print(f"Amount: {amount/100} NGN")
    print(f"Email: {email}")
    
    print(f"\n" + "="*80)
    print("PAYSTACK CHECKOUT URL:")
    print("="*80)
    print(f"\n{auth_url}\n")
    
    print("="*80)
    print("TEST CARD DETAILS:")
    print("="*80)
    print("\nCard Number: 4084084084084081")
    print("Expiry:      01/30")
    print("CVV:         408")
    print("Name:        Test Payment")
    
    print("\n" + "="*80)
    print("INSTRUCTIONS:")
    print("="*80)
    print("\n1. Click the URL above or copy/paste into browser")
    print("2. Enter test card details above")
    print("3. Complete payment")
    print("4. Check Paystack dashboard for transaction")
    print(f"5. Transaction reference: {ref}")
    
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
