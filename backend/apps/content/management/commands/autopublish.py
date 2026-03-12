"""
Auto-Publish Scheduled Daily Posts

Handles two cases:
1. Posts with status=SCHEDULED and published_at <= now (time-scheduled posts)
2. Posts with status=DRAFT and scheduled_date <= today (date-scheduled daily words)

Run via Celery Beat every hour at :01, or manually:
    python manage.py autopublish
    python manage.py autopublish --dry-run
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from django.contrib.contenttypes.models import ContentType
from apps.content.models import Post, PostStatus
from apps.moderation.models import AuditLog, ActionType
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Auto-publish scheduled and date-due daily posts'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be published without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        now = timezone.now()
        today = now.date()
        published_count = 0
        failed_count = 0

        if dry_run:
            self.stdout.write(self.style.WARNING('[DRY RUN MODE] No changes will be made'))

        self.stdout.write(f'[{now.strftime("%Y-%m-%d %H:%M:%S UTC")}] Starting autopublish...')

        # --- Case 1: DRAFT posts with scheduled_date <= today ---
        # These are daily word / devotional posts created by admins.
        date_due = Post.objects.filter(
            status=PostStatus.DRAFT,
            scheduled_date__lte=today,
            scheduled_date__isnull=False,
            is_deleted=False,
        ).select_for_update(skip_locked=True)

        # --- Case 2: SCHEDULED posts with published_at <= now ---
        # These are time-precise scheduled posts.
        time_due = Post.objects.filter(
            status=PostStatus.SCHEDULED,
            published_at__lte=now,
            is_deleted=False,
        ).select_for_update(skip_locked=True)

        from itertools import chain
        candidates = list(chain(date_due, time_due))

        if not candidates:
            self.stdout.write('No posts due for publishing.')
            return

        post_ct = ContentType.objects.get_for_model(Post)

        for post in candidates:
            try:
                if dry_run:
                    self.stdout.write(
                        self.style.WARNING(
                            f'[DRY RUN] Would publish: "{post.title}" '
                            f'(scheduled_date={post.scheduled_date}, status={post.status})'
                        )
                    )
                    published_count += 1
                    continue

                with transaction.atomic():
                    post.refresh_from_db()
                    # Skip if already published by another worker
                    if post.status == PostStatus.PUBLISHED:
                        continue

                    post.status = PostStatus.PUBLISHED
                    post.is_published = True
                    if post.published_at is None:
                        post.published_at = now
                    post.save(update_fields=['status', 'is_published', 'published_at', 'updated_at'])

                    AuditLog.objects.create(
                        user=post.author,
                        action_type=ActionType.PUBLISH,
                        description=(
                            f'Auto-published: "{post.title}" '
                            f'(scheduled_date={post.scheduled_date})'
                        ),
                        content_type=post_ct,
                        object_id=str(post.id),
                        ip_address='127.0.0.1',
                        user_agent='AutoPublish Background Job',
                    )

                    published_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'✓ Published: "{post.title}" (id={post.id}, date={post.scheduled_date})'
                        )
                    )
                    logger.info(f'AutoPublish: published post {post.id} ({post.title})')

            except Exception as exc:
                failed_count += 1
                logger.error(f'AutoPublish: failed to publish post {post.id}: {exc}', exc_info=True)
                self.stdout.write(self.style.ERROR(f'✗ Failed: "{post.title}" — {exc}'))

        self.stdout.write(
            self.style.SUCCESS(
                f'Done. Published={published_count}, Failed={failed_count}, '
                f'{"(dry run)" if dry_run else ""}'
            )
        )
