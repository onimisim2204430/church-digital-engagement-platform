"""
405 Method Not Allowed Diagnostic Script
Run this with: python manage.py shell < diagnose_405.py
"""

print("\n" + "=" * 80)
print("DIAGNOSTIC 1: VIEW CLASS INSPECTION")
print("=" * 80)

from apps.users.email_verification_views import InitiateEmailVerificationView
from rest_framework.views import APIView

view_class = InitiateEmailVerificationView
print(f"View name: {view_class.__name__}")
print(f"Base classes: {view_class.__bases__}")
print(f"Has post method: {hasattr(view_class, 'post')}")
print(f"Post method type: {type(getattr(view_class, 'post', None))}")
print(f"Post method callable: {callable(getattr(view_class, 'post', None))}")
print(f"http_method_names: {getattr(view_class, 'http_method_names', None)}")
print(f"Authentication classes: {view_class.authentication_classes}")
print(f"Permission classes: {view_class.permission_classes}")

print("\n" + "=" * 80)
print("DIAGNOSTIC 2: URL RESOLUTION")
print("=" * 80)

from django.urls import resolve

# Test trailing slash version
try:
    match = resolve('/api/v1/auth/verify-email/initiate/')
    print(f"[SUCCESS] Trailing slash resolves to: {match.func.__name__}")
    print(f"  URL name: {match.url_name}")
    print(f"  kwargs: {match.kwargs}")
except Exception as e:
    print(f"[FAIL] Trailing slash resolution failed: {e}")

print()

# Test non-trailing slash version
try:
    match = resolve('/api/v1/auth/verify-email/initiate')
    print(f"[SUCCESS] No trailing slash resolves to: {match.func.__name__}")
    print(f"  URL name: {match.url_name}")
    print(f"  kwargs: {match.kwargs}")
except Exception as e:
    print(f"[FAIL] No trailing slash resolution failed: {e}")

print("\n" + "=" * 80)
print("DIAGNOSTIC 3: TEST VIEW INSPECTION")
print("=" * 80)

try:
    from apps.users.test_views import TestVerificationView
    test_view = TestVerificationView
    print(f"Test view name: {test_view.__name__}")
    print(f"Has post method: {hasattr(test_view, 'post')}")
    print(f"Post callable: {callable(getattr(test_view, 'post', None))}")
except ImportError as e:
    print(f"[FAIL] Test view not found: {e}")

print("\n" + "=" * 80)
print("DIAGNOSTIC 4: URL PATTERNS")
print("=" * 80)

from django.urls import get_resolver
resolver = get_resolver()

print("\nSearching for verify-email patterns:")
for pattern in resolver.url_patterns:
    pattern_str = str(pattern.pattern)
    if 'verify-email' in pattern_str or 'test-verify' in pattern_str:
        print(f"  {pattern_str}")

print("\n" + "=" * 80)
print("DIAGNOSTIC COMPLETE")
print("=" * 80)
