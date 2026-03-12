#!/usr/bin/env python
"""Test daily word creation with the fixed code"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.content.models import Post, PostStatus, PostType, PostContentType
from apps.users.models import User
from django.utils import timezone

# Get or create the devotional content type
devotional_type, _ = PostContentType.objects.get_or_create(
    slug='devotional',
    defaults={'name': 'Devotional', 'is_system': True}
)

# Get first admin user
admin = User.objects.filter(is_staff=True).first()
if not admin:
    print("No admin user found")
else:
    try:
        post = Post.objects.create(
            title='Test Daily Word',
            content='<p>Test content</p>',
            author=admin,
            content_type=devotional_type,
            post_type=PostType.DEVOTIONAL,
            scheduled_date=timezone.now().date(),
            status=PostStatus.DRAFT
        )
        print(f"✓ Daily Word created successfully!")
        print(f"  ID: {post.id}")
        print(f"  Status: {post.status}")
        print(f"  Title: {post.title}")
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
