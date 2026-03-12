"""
Celery configuration for Church Digital Platform

This module configures Celery for handling background tasks such as:
- Email campaigns
- Scheduled notifications
- Data processing
- Report generation

It also standardizes startup output (banner, service table, task summary)
using the shared utils.startup_display helpers.
"""

import logging
import os
from datetime import datetime

from celery import Celery, signals
from django.conf import settings

from utils.startup_display import (
    is_primary_process,
    print_ready_line,
    render_celery_startup,
    setup_color_logging,
)

# Set default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('church_platform')

# Load configuration from Django settings with CELERY_ prefix
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks from all registered Django apps
app.autodiscover_tasks()


@signals.setup_logging.connect
def configure_logging(**kwargs):
    """
    Install Rich-based color logging and suppress noisy spawn chatter.
    """
    setup_color_logging(level=logging.INFO)
    # Returning True prevents Celery from configuring logging again
    return True


@signals.worker_ready.connect
def on_worker_ready(sender=None, **kwargs):
    """
    Render the standardized startup output once per worker master process.
    """
    if not is_primary_process():
        return

    environment = "development" if getattr(settings, "DEBUG", False) else "production"

    # Pull worker pool size if available
    pool = getattr(sender, "pool", None)
    worker_concurrency = getattr(pool, "num_processes", None) if pool else None

    email_conf = {
        "backend": getattr(settings, "EMAIL_BACKEND", ""),
        "host": getattr(settings, "EMAIL_HOST", ""),
        "port": getattr(settings, "EMAIL_PORT", ""),
        "user": getattr(settings, "EMAIL_HOST_USER", ""),
        "default_from": getattr(settings, "DEFAULT_FROM_EMAIL", ""),
        "password": getattr(settings, "EMAIL_HOST_PASSWORD", ""),
        "use_tls": getattr(settings, "EMAIL_USE_TLS", False),
    }

    render_celery_startup(
        app,
        environment=environment,
        broker_url=getattr(settings, "CELERY_BROKER_URL", ""),
        result_backend=getattr(settings, "CELERY_RESULT_BACKEND", ""),
        email_conf=email_conf,
        worker_concurrency=worker_concurrency,
    )

    worker_name = getattr(sender, "hostname", "celery")
    print_ready_line(worker_name)


@app.task(bind=True)
def debug_task(self):
    """Debug task for testing Celery setup."""
    print(f'Request: {self.request!r}')
