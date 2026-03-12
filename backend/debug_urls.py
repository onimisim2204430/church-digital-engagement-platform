"""
Debug script to show all URL patterns and test routing
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

print("\n" + "="*80)
print("ALL REGISTERED URL PATTERNS (IN ORDER)")
print("="*80 + "\n")

from django.urls import get_resolver

resolver = get_resolver()
patterns = resolver.url_patterns

for i, pattern in enumerate(patterns, 1):
    print(f"{i}. Pattern: {pattern.pattern}")
    if hasattr(pattern, 'name'):
        print(f"   Name: {pattern.name}")
    if hasattr(pattern, 'callback'):
        print(f"   View: {pattern.callback}")
    print()

print("\n" + "="*80)
print("TEST URL RESOLUTION")
print("="*80 + "\n")

from django.urls import resolve
from django.urls.exceptions import Resolver404

test_urls = [
    '/verify-email/',
    '/api/v1/auth/verify-email/',
    '/api/v1/auth/verify-email/initiate/',
    '/api/test-verify/',
    '/admin/',
    '/',
]

for test_url in test_urls:
    try:
        match = resolve(test_url)
        print(f"✓ {test_url}")
        print(f"  View: {match.func}")
        print(f"  URL name: {match.url_name}")
        print(f"  Route: {match.route}")
    except Resolver404 as e:
        print(f"✗ {test_url}: NOT FOUND")
        print(f"  Error: {e}")
    print()

print("\n" + "="*80)
print("REACT CATCH-ALL REGEX TEST")
print("="*80 + "\n")

import re
regex_pattern = r'^(?!api/|admin/|static/|media/).*$'
regex = re.compile(regex_pattern)

test_paths = [
    'verify-email/',
    'api/v1/auth/verify-email/',
    'admin/',
    'static/js/app.js',
    'media/uploads/image.jpg',
]

for path in test_paths:
    match = regex.match(path)
    print(f"Path: {path}")
    print(f"Matches React catch-all: {'YES' if match else 'NO'}")
    print()
