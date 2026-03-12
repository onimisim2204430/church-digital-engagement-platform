#!/usr/bin/env python
"""
SCHEDULED PUBLISHING DEBUG SCRIPT (PRODUCTION-SAFE)
READ-ONLY DIAGNOSTIC TOOL - MAKES NO CHANGES
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from apps.content.models import Post, PostStatus
from django.utils import timezone
from django.conf import settings

print('='*70)
print('🔍 SCHEDULED PUBLISHING DEBUG REPORT')
print('='*70)

# ============================================================================
# LAYER 1: TIMEZONE CONFIGURATION
# ============================================================================
print('\n[LAYER 1] TIMEZONE CONFIGURATION')
print('-'*70)
print(f'✓ TIME_ZONE setting: {settings.TIME_ZONE}')
print(f'✓ USE_TZ setting: {settings.USE_TZ}')

now = timezone.now()
print(f'✓ Current Time (Django): {now.strftime("%Y-%m-%d %H:%M:%S %Z")}')
print(f'✓ Current Time (ISO): {now.isoformat()}')
print(f'✓ Is timezone-aware?: {timezone.is_aware(now)}')

# ============================================================================
# LAYER 2: DATABASE RECORDS
# ============================================================================
print('\n[LAYER 2] DATABASE RECORDS')
print('-'*70)

# Count all posts by status
draft_count = Post.objects.filter(status=PostStatus.DRAFT, is_deleted=False).count()
scheduled_count = Post.objects.filter(status=PostStatus.SCHEDULED, is_deleted=False).count()
published_count = Post.objects.filter(status=PostStatus.PUBLISHED, is_deleted=False).count()

print(f'Total DRAFT posts: {draft_count}')
print(f'Total SCHEDULED posts: {scheduled_count}')
print(f'Total PUBLISHED posts: {published_count}')

# ============================================================================
# LAYER 3: SCHEDULED POSTS ANALYSIS
# ============================================================================
print('\n[LAYER 3] SCHEDULED POSTS DETAILED ANALYSIS')
print('-'*70)

scheduled_posts = Post.objects.filter(
    status=PostStatus.SCHEDULED,
    is_deleted=False
).order_by('published_at')

if scheduled_posts.exists():
    print(f'Found {scheduled_posts.count()} scheduled post(s):\n')
    
    for idx, post in enumerate(scheduled_posts, 1):
        print(f'🔸 Post #{idx}')
        print(f'   ID: {post.id}')
        print(f'   Title: {post.title}')
        print(f'   Status: {post.status}')
        print(f'   is_published flag: {post.is_published}')
        
        if post.published_at:
            print(f'   published_at: {post.published_at.strftime("%Y-%m-%d %H:%M:%S %Z")}')
            print(f'   published_at (ISO): {post.published_at.isoformat()}')
            print(f'   Is timezone-aware?: {timezone.is_aware(post.published_at)}')
            
            # Time comparison
            time_diff = now - post.published_at
            time_diff_seconds = time_diff.total_seconds()
            time_diff_minutes = time_diff_seconds / 60
            
            print(f'   Time difference: {time_diff} ({time_diff_minutes:.1f} minutes)')
            
            # Critical comparison
            should_publish = post.published_at <= now
            print(f'   published_at <= now?: {should_publish}')
            
            if should_publish:
                print(f'   ✅ ELIGIBLE FOR PUBLISHING (time has passed)')
            else:
                print(f'   ⏳ NOT YET (scheduled for future)')
                print(f'   Will publish in: {abs(time_diff_minutes):.1f} minutes')
        else:
            print(f'   ⚠️  published_at is NULL!')
        
        print(f'   created_at: {post.created_at.strftime("%Y-%m-%d %H:%M:%S %Z")}')
        print(f'   updated_at: {post.updated_at.strftime("%Y-%m-%d %H:%M:%S %Z")}')
        print()
else:
    print('⚠️  NO SCHEDULED POSTS FOUND\n')

# ============================================================================
# LAYER 4: QUERY LOGIC TEST
# ============================================================================
print('\n[LAYER 4] AUTOPUBLISH QUERY LOGIC TEST')
print('-'*70)

# Replicate exact query from autopublish command
query_result = Post.objects.filter(
    status=PostStatus.SCHEDULED,
    published_at__lte=now,
    is_deleted=False
)

eligible_count = query_result.count()
print(f'Query: Post.objects.filter(')
print(f'    status=SCHEDULED,')
print(f'    published_at__lte={now.strftime("%Y-%m-%d %H:%M:%S %Z")},')
print(f'    is_deleted=False')
print(f')')
print(f'\nResult: {eligible_count} post(s) match')

if eligible_count > 0:
    print(f'\n✅ Query is finding eligible posts!')
    for post in query_result:
        print(f'   - {post.id}: {post.title}')
else:
    print(f'\n❌ Query returns ZERO posts!')
    print('\nPossible causes:')
    
    # Check for scheduled posts at all
    if scheduled_count == 0:
        print('   1. No posts have status=SCHEDULED')
    else:
        print(f'   1. {scheduled_count} scheduled post(s) exist but time check fails')
        
        # Check time comparison issues
        for post in scheduled_posts:
            if post.published_at:
                if not timezone.is_aware(post.published_at):
                    print(f'   2. ⚠️  Post {post.id} has NAIVE datetime (not timezone-aware)!')
                    print(f'      This will cause comparison failures!')
                elif post.published_at > now:
                    print(f'   2. Post {post.id} scheduled for future ({post.published_at})')
            else:
                print(f'   3. ⚠️  Post {post.id} has NULL published_at!')

# ============================================================================
# LAYER 5: ANOMALY DETECTION
# ============================================================================
print('\n[LAYER 5] ANOMALY DETECTION')
print('-'*70)

# Check for posts with past published_at but wrong status
anomalies = Post.objects.filter(
    published_at__lte=now,
    is_deleted=False
).exclude(status=PostStatus.PUBLISHED)

if anomalies.exists():
    print(f'🚨 FOUND {anomalies.count()} ANOMALY(IES):')
    print('   Posts with past published_at but NOT published status:\n')
    
    for post in anomalies:
        print(f'   Post ID: {post.id}')
        print(f'   Title: {post.title}')
        print(f'   Status: {post.status} (expected: PUBLISHED)')
        print(f'   published_at: {post.published_at}')
        print(f'   Time ago: {now - post.published_at}')
        print()
else:
    print('✓ No anomalies detected')

# Check for published posts without published_at
no_timestamp = Post.objects.filter(
    status=PostStatus.PUBLISHED,
    published_at__isnull=True,
    is_deleted=False
)

if no_timestamp.exists():
    print(f'\n🚨 FOUND {no_timestamp.count()} PUBLISHED POST(S) WITHOUT TIMESTAMP:')
    for post in no_timestamp:
        print(f'   - {post.id}: {post.title}')
else:
    print('✓ All published posts have timestamps')

# ============================================================================
# LAYER 6: SCHEDULER EXECUTION CHECK
# ============================================================================
print('\n[LAYER 6] SCHEDULER EXECUTION CHECK')
print('-'*70)

from apps.moderation.models import AuditLog, ActionType
from django.contrib.contenttypes.models import ContentType

# Check for recent autopublish activity
content_type = ContentType.objects.get_for_model(Post)
recent_autopublish = AuditLog.objects.filter(
    action_type=ActionType.PUBLISH,
    user_agent__icontains='AutoPublish'
).order_by('-created_at')[:5]

if recent_autopublish.exists():
    print(f'✓ Found {recent_autopublish.count()} recent autopublish log entries:')
    for log in recent_autopublish:
        print(f'   - {log.created_at.strftime("%Y-%m-%d %H:%M:%S")}: {log.description}')
else:
    print('⚠️  No autopublish activity found in audit logs')
    print('   This suggests:')
    print('   - Autopublish command has never run successfully, OR')
    print('   - No posts have been auto-published yet')

# ============================================================================
# DIAGNOSTIC SUMMARY
# ============================================================================
print('\n' + '='*70)
print('📊 DIAGNOSTIC SUMMARY')
print('='*70)

issues_found = []

if settings.TIME_ZONE != 'UTC':
    issues_found.append('⚠️  TIME_ZONE is not UTC')

if not settings.USE_TZ:
    issues_found.append('⚠️  USE_TZ is False')

if scheduled_count > 0 and eligible_count == 0:
    issues_found.append('🚨 CRITICAL: Scheduled posts exist but query returns zero')

if anomalies.exists():
    issues_found.append(f'🚨 CRITICAL: {anomalies.count()} posts with past published_at not published')

if not recent_autopublish.exists():
    issues_found.append('⚠️  No autopublish activity in audit logs')

if issues_found:
    print('\n🔴 ISSUES DETECTED:\n')
    for issue in issues_found:
        print(f'   {issue}')
else:
    print('\n✅ NO ISSUES DETECTED')
    print('   System configuration appears correct.')
    
    if scheduled_count == 0:
        print('\n   ℹ️  No scheduled posts currently exist.')
        print('   Create a test post to verify autopublish works.')

print('\n' + '='*70)
print('Debug report complete.')
print('='*70 + '\n')
