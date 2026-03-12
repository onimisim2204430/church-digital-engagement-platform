#!/usr/bin/env python
"""
Quick script to check for saved drafts
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.content.models import Draft

print("\n" + "="*60)
print("CHECKING FOR SAVED DRAFTS")
print("="*60 + "\n")

drafts = Draft.objects.all().order_by('-last_autosave_at')

if drafts.count() == 0:
    print("❌ No drafts found in database\n")
    print("This means:")
    print("  • Auto-save hasn't triggered yet (needs 3 seconds idle)")
    print("  • Or the form wasn't properly initialized")
    print("  • Or there was an authentication issue")
else:
    print(f"✅ Found {drafts.count()} draft(s):\n")
    
    for i, draft in enumerate(drafts, 1):
        print(f"Draft #{i}:")
        print(f"  ID: {draft.id}")
        print(f"  Title: {draft.draft_title or '(No title)'}")
        print(f"  User: {draft.user.email}")
        print(f"  Type: {draft.content_type.name if draft.content_type else '(No type selected)'}")
        print(f"  Content Preview: {draft.get_preview(max_length=100)}")
        print(f"  Last Saved: {draft.last_autosave_at}")
        print(f"  Version: {draft.version}")
        print(f"  Post ID: {draft.post_id or '(New post)'}")
        print()

print("="*60)
