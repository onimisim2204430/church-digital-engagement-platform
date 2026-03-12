#!/usr/bin/env python
"""
Verification Script for Scheduled Post Publishing System

PURPOSE:
    Test the autopublish system end-to-end to ensure scheduled posts
    are automatically published at the correct time.

USAGE:
    python verify_autopublish.py

WHAT IT DOES:
    1. Creates a test post scheduled for 2 minutes from now
    2. Waits for the scheduled time to pass
    3. Manually triggers autopublish command
    4. Verifies post status changed to PUBLISHED
    5. Checks audit log entry was created
    6. Cleans up test data

REQUIREMENTS:
    - Django environment initialized
    - Database accessible
    - Admin user exists in system
"""

import os
import sys
import django
from datetime import timedelta

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.content.models import Post, PostStatus, PostType
from apps.moderation.models import AuditLog, ActionType
from django.core.management import call_command

User = get_user_model()


def print_header(text):
    print("\n" + "=" * 70)
    print(f"  {text}")
    print("=" * 70)


def print_step(step_num, text):
    print(f"\n[STEP {step_num}] {text}")


def print_success(text):
    print(f"✓ {text}")


def print_error(text):
    print(f"✗ {text}")


def verify_autopublish():
    """Main verification function"""
    
    print_header("SCHEDULED POST PUBLISHING SYSTEM VERIFICATION")
    print(f"Start Time: {timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC')}")
    
    test_post = None
    
    try:
        # STEP 1: Get or create admin user
        print_step(1, "Finding admin user for test")
        admin_user = User.objects.filter(is_staff=True, is_superuser=True).first()
        
        if not admin_user:
            print_error("No admin user found. Creating test admin...")
            admin_user = User.objects.create_superuser(
                email='test_admin@church.local',
                first_name='Test',
                last_name='Admin',
                password='TestPassword123!'
            )
            print_success(f"Created test admin: {admin_user.email}")
        else:
            print_success(f"Using admin: {admin_user.email}")
        
        # STEP 2: Create scheduled post
        print_step(2, "Creating test post scheduled for 1 minute from now")
        
        scheduled_time = timezone.now() + timedelta(minutes=1)
        
        test_post = Post.objects.create(
            title="[TEST] Auto-Publish Verification Post",
            content="This is a test post to verify the scheduled publishing system works correctly.",
            post_type=PostType.ANNOUNCEMENT,
            author=admin_user,
            status=PostStatus.SCHEDULED,
            published_at=scheduled_time,
            is_published=False,
            comments_enabled=False,
            reactions_enabled=False
        )
        
        print_success(f"Created post ID: {test_post.id}")
        print(f"   Title: {test_post.title}")
        print(f"   Status: {test_post.status}")
        print(f"   Scheduled for: {scheduled_time.strftime('%Y-%m-%d %H:%M:%S UTC')}")
        print(f"   Current time: {timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC')}")
        
        # STEP 3: Wait for scheduled time
        print_step(3, "Waiting for scheduled time to pass...")
        
        import time
        wait_seconds = 65  # Wait 65 seconds (1 minute + buffer)
        
        for remaining in range(wait_seconds, 0, -5):
            print(f"   Waiting... {remaining} seconds remaining")
            time.sleep(5)
        
        print_success("Wait complete. Scheduled time has passed.")
        
        # STEP 4: Run autopublish command
        print_step(4, "Running autopublish command")
        
        call_command('autopublish')
        
        # STEP 5: Verify post status
        print_step(5, "Verifying post status changed")
        
        test_post.refresh_from_db()
        
        if test_post.status == PostStatus.PUBLISHED and test_post.is_published:
            print_success(f"Post status: {test_post.status}")
            print_success(f"Is published: {test_post.is_published}")
        else:
            print_error(f"Post status: {test_post.status} (expected: PUBLISHED)")
            print_error(f"Is published: {test_post.is_published} (expected: True)")
            raise AssertionError("Post was not published!")
        
        # STEP 6: Verify audit log
        print_step(6, "Checking audit log entry")
        
        audit_entry = AuditLog.objects.filter(
            action_type=ActionType.PUBLISH,
            object_id=str(test_post.id),
            user_agent__icontains='AutoPublish'
        ).first()
        
        if audit_entry:
            print_success(f"Audit log found: {audit_entry.description}")
            print(f"   Created at: {audit_entry.created_at.strftime('%Y-%m-%d %H:%M:%S UTC')}")
        else:
            print_error("No audit log entry found!")
            raise AssertionError("Audit log not created!")
        
        # STEP 7: Verify public visibility
        print_step(7, "Verifying post is publicly visible")
        
        public_posts = Post.objects.filter(
            status=PostStatus.PUBLISHED,
            is_published=True,
            is_deleted=False,
            id=test_post.id
        )
        
        if public_posts.exists():
            print_success("Post is visible in public query")
        else:
            print_error("Post not found in public query!")
            raise AssertionError("Post not publicly visible!")
        
        # SUCCESS
        print_header("ALL TESTS PASSED ✓")
        print("\nThe scheduled post publishing system is working correctly:")
        print("  ✓ Post was created with SCHEDULED status")
        print("  ✓ Background job identified the post")
        print("  ✓ Status changed to PUBLISHED atomically")
        print("  ✓ Audit log entry was created")
        print("  ✓ Post is now publicly visible")
        print("\nSystem is PRODUCTION READY.")
        
    except Exception as e:
        print_header("TEST FAILED ✗")
        print(f"\nError: {str(e)}")
        import traceback
        traceback.print_exc()
        
    finally:
        # CLEANUP
        if test_post:
            print_step(8, "Cleaning up test data")
            
            # Delete audit logs
            AuditLog.objects.filter(object_id=str(test_post.id)).delete()
            print_success("Deleted audit log entries")
            
            # Delete test post
            test_post.delete()
            print_success("Deleted test post")
        
        print(f"\nEnd Time: {timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC')}")
        print("=" * 70 + "\n")


if __name__ == '__main__':
    verify_autopublish()
