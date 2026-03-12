#!/usr/bin/env python
"""Verify Series content type exists"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.content.models import PostContentType

# Check if Series exists
series_type = PostContentType.objects.filter(slug='series').first()

print("=== Series Content Type Check ===")
if series_type:
    print("Status: Series content type EXISTS")
    print(f"ID: {series_type.id}")
    print(f"Name: {series_type.name}")
    print(f"Enabled: {series_type.is_enabled}")
    print(f"System Type: {series_type.is_system}")
else:
    print("ERROR: Series content type NOT FOUND")
    print("\nAvailable content types:")
    for t in PostContentType.objects.all().values('slug', 'name'):
        print(f"  - {t['slug']}: {t['name']}")
