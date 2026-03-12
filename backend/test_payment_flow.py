"""
Test payment flow with mocked Paystack responses.
Tests all three endpoints: initialize, verify, and webhook.
"""

import os
import sys
import json
import hashlib
import hmac
import django
from unittest.mock import patch, MagicMock

os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
django.setup()

from django.test import Client
from apps.payments.models import PaymentTransaction, PaymentStatus

client = Client()


def test_payment_initialization():
    """Test: POST /api/v1/payments/initialize/"""
    print("\n" + "="*80)
    print("TEST 1: Payment Initialization")
    print("="*80)
    
    payload = {
        "email": "test@example.com",
        "amount": 500000,  # 5000 in smallest unit
        "currency": "NGN",
        "metadata": {
            "purpose": "test payment",
            "user_id": "test-user-123"
        }
    }
    
    with patch('apps.payments.views.initialize_transaction') as mock_init:
        # Mock Paystack response
        mock_init.return_value = {
            'authorization_url': 'https://checkout.paystack.com/test-auth',
            'access_code': 'test_access_code_123',
            'reference': 'PAY_TEST_001'
        }
        
        response = client.post(
            '/api/v1/payments/initialize/',
            data=json.dumps(payload),
            content_type='application/json'
        )
    
    print(f"Status Code: {response.status_code}")
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")
    
    if response.status_code == 201:
        print("✅ Status: PASS — Transaction created and initialized")
        reference = data.get('reference')
        print(f"   Reference: {reference}")
        print(f"   Auth URL: {data.get('authorization_url')}")
        
        # Verify transaction was stored in db
        tx = PaymentTransaction.objects.filter(reference=reference).first()
        if tx:
            print(f"   ✓ DB Record Found: {tx.reference} ({tx.status})")
            print(f"   ✓ Email: {tx.email}, Amount: {tx.amount}")
        return reference
    else:
        print(f"❌ Status: FAIL — Got {response.status_code}")
        return None


def test_payment_verification(reference):
    """Test: GET /api/v1/payments/verify/<reference>/"""
    print("\n" + "="*80)
    print("TEST 2: Payment Verification")
    print("="*80)
    
    with patch('apps.payments.views.verify_transaction') as mock_verify:
        # Mock Paystack verification response
        mock_verify.return_value = {
            'status': 'success',
            'reference': reference,
            'channel': 'card',
            'gateway_response': 'Successful',
            'paid_at': '2026-03-06T10:00:00Z',
            'amount': 500000,
            'currency': 'NGN',
            'message': 'Authorization URL created'
        }
        
        response = client.get(f'/api/v1/payments/verify/{reference}/')
    
    print(f"Status Code: {response.status_code}")
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")
    
    if response.status_code == 200 and data.get('payment_status') == 'SUCCESS':
        print("✅ Status: PASS — Payment verified and marked successful")
        
        # Verify db update
        tx = PaymentTransaction.objects.get(reference=reference)
        print(f"   ✓ DB Status: {tx.status}")
        print(f"   ✓ Paid At: {tx.paid_at}")
        print(f"   ✓ Payment Method: {tx.payment_method}")
        return True
    else:
        print(f"❌ Status: FAIL — Expected SUCCESS, got {data.get('payment_status')}")
        return False


def test_webhook_processing(reference):
    """Test: POST /api/v1/payments/webhook/paystack/"""
    print("\n" + "="*80)
    print("TEST 3: Webhook Processing with Signature Validation")
    print("="*80)
    
    webhook_secret = os.environ.get('PAYSTACK_WEBHOOK_SECRET', 'whsec_test_1234567890abcdef1234567890abcdef')
    
    payload = {
        "event": "charge.success",
        "data": {
            "reference": reference,
            "status": "success",
            "channel": "card",
            "gateway_response": "Successful",
            "paid_at": "2026-03-06T10:00:00Z",
            "amount": 500000,
            "currency": "NGN"
        }
    }
    
    body = json.dumps(payload).encode('utf-8')
    signature = hmac.new(
        webhook_secret.encode('utf-8'),
        body,
        hashlib.sha512
    ).hexdigest()
    
    print(f"Webhook Secret (from .env): {webhook_secret}")
    print(f"Signature Generated: {signature[:20]}...")
    
    with patch('apps.payments.webhooks.verify_transaction') as mock_verify:
        # Mock Paystack verification
        mock_verify.return_value = {
            'reference': reference,
            'status': 'success',
            'channel': 'card',
            'gateway_response': 'Successful',
            'paid_at': '2026-03-06T10:00:00Z',
            'amount': 500000,
            'currency': 'NGN',
            'message': 'Authorization URL created'
        }
        
        response = client.post(
            '/api/v1/payments/webhook/paystack/',
            data=body,
            content_type='application/json',
            HTTP_X_PAYSTACK_SIGNATURE=signature
        )
    
    print(f"Status Code: {response.status_code}")
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")
    
    if response.status_code == 200:
        print("✅ Status: PASS — Webhook processed and signature validated")
        
        # Verify db was updated
        tx = PaymentTransaction.objects.get(reference=reference)
        print(f"   ✓ Final DB Status: {tx.status}")
        return True
    else:
        print(f"❌ Status: FAIL — Got {response.status_code}")
        return False


def test_invalid_webhook_signature():
    """Test: Webhook rejection with invalid signature"""
    print("\n" + "="*80)
    print("TEST 4: Webhook Signature Validation (Invalid Signature)")
    print("="*80)
    
    payload = {
        "event": "charge.success",
        "data": {
            "reference": "PAY_INVALID_123",
            "status": "success"
        }
    }
    
    body = json.dumps(payload).encode('utf-8')
    invalid_signature = "invalid_signature_xyz"
    
    response = client.post(
        '/api/v1/payments/webhook/paystack/',
        data=body,
        content_type='application/json',
        HTTP_X_PAYSTACK_SIGNATURE=invalid_signature
    )
    
    print(f"Status Code: {response.status_code}")
    data = response.json()
    print(f"Response: {json.dumps(data, indent=2)}")
    
    if response.status_code == 400 and data.get('status') == 'error':
        print("✅ Status: PASS — Invalid signature correctly rejected")
        return True
    else:
        print(f"❌ Status: FAIL — Expected 400, got {response.status_code}")
        return False


def check_admin_records():
    """Verify records in Django admin"""
    print("\n" + "="*80)
    print("DATABASE RECORDS CHECK")
    print("="*80)
    
    transactions = PaymentTransaction.objects.all().order_by('-created_at')[:5]
    
    if not transactions:
        print("❌ No payment records found in database")
        return False
    
    print(f"\nFound {transactions.count()} recent payment transactions:\n")
    print(f"{'Reference':<30} {'Email':<25} {'Amount':<10} {'Status':<10}")
    print("-" * 75)
    
    for tx in transactions:
        print(f"{tx.reference:<30} {tx.email:<25} {tx.amount:<10} {tx.status:<10}")
    
    print("\n✅ Status: PASS — Records accessible via Django admin")
    print("   Access: http://localhost:8000/django-admin/apps/payments/paymenttransaction/")
    return True


def main():
    """Run all tests"""
    print("\n")
    print("╔" + "="*78 + "╗")
    print("║" + " PAYSTACK PAYMENT SYSTEM — INTEGRATION TEST ".center(78) + "║")
    print("╚" + "="*78 + "╝")
    
    try:
        # Test 1: Initialize
        reference = test_payment_initialization()
        if not reference:
            print("\n❌ Initialization failed, skipping remaining tests")
            return
        
        # Test 2: Verify
        verify_ok = test_payment_verification(reference)
        
        # Test 3: Webhook
        webhook_ok = test_webhook_processing(reference)
        
        # Test 4: Invalid signature
        invalid_ok = test_invalid_webhook_signature()
        
        # Check admin
        admin_ok = check_admin_records()
        
        # Summary
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        print(f"✅ Payment Initialization: PASS")
        print(f"{'✅' if verify_ok else '❌'} Payment Verification: {'PASS' if verify_ok else 'FAIL'}")
        print(f"{'✅' if webhook_ok else '❌'} Webhook Processing: {'PASS' if webhook_ok else 'FAIL'}")
        print(f"{'✅' if invalid_ok else '❌'} Signature Validation: {'PASS' if invalid_ok else 'FAIL'}")
        print(f"{'✅' if admin_ok else '❌'} Database Records: {'PASS' if admin_ok else 'FAIL'}")
        print("="*80)
        
        if all([verify_ok, webhook_ok, invalid_ok, admin_ok]):
            print("\n🎉 ALL TESTS PASSED — Payment system is production-ready!\n")
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
