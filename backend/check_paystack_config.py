#!/usr/bin/env python
"""Check Paystack configuration"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings

print("PAYSTACK Configuration:")
print(f"  SECRET_KEY: {getattr(settings, 'PAYSTACK_SECRET_KEY', 'NOT CONFIGURED')[:20]}...")
print(f"  PUBLIC_KEY: {getattr(settings, 'PAYSTACK_PUBLIC_KEY', 'NOT CONFIGURED')[:20]}...")
print(f"  WEBHOOK_SECRET: {getattr(settings, 'PAYSTACK_WEBHOOK_SECRET', 'NOT CONFIGURED')[:20]}...")
