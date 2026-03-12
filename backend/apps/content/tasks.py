"""Celery tasks for content auto-publishing."""

import logging
from celery import shared_task
from django.core.management import call_command

logger = logging.getLogger(__name__)


@shared_task(
    name='content.autopublish_scheduled_posts',
    max_retries=2,
    default_retry_delay=60,
    bind=True,
)
def autopublish_scheduled_posts(self):
    """
    Auto-publish daily words and scheduled posts.
    Runs every hour at :01 via Celery Beat.
    Delegates to the autopublish management command.
    """
    try:
        call_command('autopublish')
    except Exception as exc:
        logger.error(f'autopublish_scheduled_posts task failed: {exc}', exc_info=True)
        raise self.retry(exc=exc)
