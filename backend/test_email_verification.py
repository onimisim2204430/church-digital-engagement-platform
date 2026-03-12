"""
Comprehensive Email Verification Endpoint Diagnostic Test
Tests all aspects of the email verification workflow
"""
import os
import sys
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework_simplejwt.tokens import RefreshToken
import traceback

User = get_user_model()

print("\n" + "="*80)
print("EMAIL VERIFICATION ENDPOINT COMPREHENSIVE TEST")
print("="*80 + "\n")

# Clean up any test users first
User.objects.filter(email='test.verify@example.com').delete()

# Create a test user
test_user = User.objects.create_user(
    email='test.verify@example.com',
    password='TestPass123!',
    first_name='Test',
    last_name='Verify'
)
test_user.email_verified = False
test_user.save()
print(f"[OK] Created test user: {test_user.email}")
print(f"  Email verified: {test_user.email_verified}\n")

# Generate a test JWT token for the user
refresh = RefreshToken.for_user(test_user)
access_token = str(refresh.access_token)
print(f"[OK] Generated JWT access token: {access_token[:30]}...\n")

# Initialize Django test client
client = Client()

# Test 1: Initiate verification (requires authentication)
print("-" * 80)
print("TEST 1: Initiate Email Verification (POST, Authenticated)")
print("-" * 80)
verification_token = None
try:
    response = client.post(
        '/api/v1/auth/verify-email/initiate/',
        HTTP_AUTHORIZATION=f'Bearer {access_token}',
        content_type='application/json'
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    
    # Try to get the token from the user
    if response.status_code == 200:
        test_user.refresh_from_db()
        if test_user.email_verification_token:
            verification_token = test_user.email_verification_token
            print(f"[OK] Verification token created: {verification_token[:20] if verification_token else 'None'}...")
        else:
            print("[FAIL] No verification token found on user")
    else:
        print("[FAIL] Failed to create verification token")
except Exception as e:
    print(f"[FAIL] Error: {e}")
    traceback.print_exc()

print()

# Test 2: GET /verify-email/ without token
print("-" * 80)
print("TEST 2: GET /verify-email/ WITHOUT token (should fail)")
print("-" * 80)
try:
    response = client.get('/api/v1/auth/verify-email/')
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json() if response.status_code != 405 else response.content.decode()}")
except Exception as e:
    print(f"[FAIL] Error: {e}")

print()

# Test 3: GET /verify-email/ with invalid token
print("-" * 80)
print("TEST 3: GET /verify-email/ with INVALID token")
print("-" * 80)
try:
    response = client.get('/api/v1/auth/verify-email/?token=invalid_token_12345')
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json() if response.status_code != 405 else response.content.decode()}")
except Exception as e:
    print(f"✗ Error: {e}")

print()

# Test 4: GET /verify-email/ with VALID RAW token
print("-" * 80)
print("TEST 4: GET /verify-email/ with VALID RAW token")
print("-" * 80)

# CRITICAL: We need to generate a raw token and store its hash
# In production, the raw token is sent via email
# For testing, we generate it manually
if verification_token:
    try:
        # Generate a fresh raw token for this test
        from apps.users.services.token_service import TokenService
        from django.contrib.auth.hashers import make_password
        from django.utils import timezone
        from datetime import timedelta
        
        # Generate a new raw token
        raw_token, hashed_token = TokenService.generate_token()
        
        print(f"[DEBUG] Generated raw token: {raw_token[:20]}...")
        print(f"[DEBUG] Generated hashed token: {hashed_token[:30]}...")
        
        # Store the hashed token in the database
        test_user.email_verification_token = hashed_token
        test_user.email_verification_token_expires_at = timezone.now() + timedelta(minutes=30)
        test_user.email_verified = False
        test_user.save()
        
        print(f"[DEBUG] Stored hashed token in database for user: {test_user.email}")
        
        # Now verify with the RAW token (not hashed)
        print(f"\n[DEBUG] Testing verification with raw token...")
        response = client.get(f'/api/v1/auth/verify-email/?token={raw_token}')
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json() if response.status_code != 405 else response.content.decode()}")
        
        # Check if user is now verified
        test_user.refresh_from_db()
        print(f"\n[SUCCESS] User email_verified after test: {test_user.email_verified}")
        if test_user.email_verified:
            print(f"[SUCCESS] Email verified at: {test_user.email_verified_at}")
            print(f"[SUCCESS] Token cleared: {test_user.email_verification_token is None}")
    except Exception as e:
        print(f"[FAIL] Error: {e}")
        traceback.print_exc()
else:
    print("[SKIP] Skipped (no valid token from Test 1)")

print()

# Test 5: POST to /verify-email/ (should be 405 Method Not Allowed)
print("-" * 80)
print("TEST 5: POST /verify-email/ (should be 405 Method Not Allowed)")
print("-" * 80)
try:
    response = client.post(
        '/api/v1/auth/verify-email/',
        data=json.dumps({'token': 'test'}),
        content_type='application/json'
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 405:
        print("[OK] Correctly returns 405 for POST")
    else:
        print(f"[WARN] Got {response.status_code} instead of 405")
    print(f"Response: {response.json() if response.status_code != 405 else response.content.decode()}")
except Exception as e:
    print(f"[FAIL] Error: {e}")

print()

# Test 6: Check routes
print("-" * 80)
print("TEST 6: URL Route Resolution")
print("-" * 80)
from django.urls import resolve
from django.urls.exceptions import Resolver404

test_paths = [
    '/verify-email/',
    '/api/v1/auth/verify-email/',
]

for path in test_paths:
    try:
        match = resolve(path)
        print(f"\n[OK] {path}")
        print(f"  View: {match.func}")
        print(f"  Name: {match.url_name}")
        print(f"  Route: {match.route}")
    except Resolver404 as e:
        print(f"[FAIL] {path}: NOT FOUND")

print("\n" + "="*80)
print("TEST SUMMARY")
print("="*80)
print(f"""
FINDINGS:
1. /verify-email/ (without /api/v1/auth/) routes to ReactAppView (catch-all)
2. /api/v1/auth/verify-email/ routes to VerifyEmailView (correct endpoint)
3. VerifyEmailView supports GET method (taking token as query param)
4. POST to /verify-email/ should return 405 Method Not Allowed
5. Frontend calls api.get('/auth/verify-email/?token=...') which with baseURL
   'http://localhost:8000/api/v1' makes request to correct endpoint

ISSUE:
If error is 405, it means a view is found but HTTP method not allowed.
This could be:
- Request hitting wrong view (ReactAppView instead of VerifyEmailView)
- VerifyEmailView not allowing GET method
- Frontend not sending correct headers/content-type

Check:
1. Is the request being made to /api/v1/auth/verify-email/?token=...?
2. What does the browser network panel show?
3. Check Django debug toolbar or server logs
""")

# Cleanup
test_user.delete()
print("[OK] Test user cleaned up")
