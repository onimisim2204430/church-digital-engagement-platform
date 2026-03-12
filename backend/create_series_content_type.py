#!/usr/bin/env python
"""Create Series content type if it doesn't exist"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.content.models import PostContentType

# Create Series content type if it doesn't exist
series_type, created = PostContentType.objects.get_or_create(
    slug='series',
    defaults={
        'name': 'Series',
        'description': 'Posts that belong to a sermon series',
        'is_system': True,
        'is_enabled': True,
        'sort_order': 0,
    }
)

if created:
    print("✅ Created Series content type")
    print(f"   ID: {series_type.id}")
    print(f"   Name: {series_type.name}")
else:
    print("✓ Series content type already exists")
    print(f"   ID: {series_type.id}")
    print(f"   Name: {series_type.name}")
