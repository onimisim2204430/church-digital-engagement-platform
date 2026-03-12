#!/usr/bin/env python
"""
Setup script for initial database migrations and checks.

Run this after installing dependencies:
    python scripts/setup.py
"""

import os
import sys
import django

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.management import call_command
from django.contrib.auth import get_user_model

User = get_user_model()


def run_migrations():
    """Run database migrations."""
    print("Running database migrations...")
    call_command('makemigrations')
    call_command('migrate')
    print("✓ Migrations complete")


def collect_static():
    """Collect static files."""
    print("Collecting static files...")
    call_command('collectstatic', '--noinput')
    print("✓ Static files collected")


def check_deployment():
    """Run deployment checks."""
    print("Running deployment checks...")
    call_command('check', '--deploy')
    print("✓ Deployment checks complete")


if __name__ == '__main__':
    print("=" * 60)
    print("Church Digital Platform - Setup Script")
    print("=" * 60)
    
    run_migrations()
    
    print("\n" + "=" * 60)
    print("Setup complete!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Create a superuser: python manage.py createsuperuser")
    print("2. Run the development server: python manage.py runserver")
    print("3. Access admin at: http://localhost:8000/admin/")
    print("4. Access API docs at: http://localhost:8000/api/v1/docs/")
