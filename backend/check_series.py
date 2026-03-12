#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.series.models import Series

print("\n=== Series in Database ===")
series_list = Series.objects.all()
print(f"Total series: {series_list.count()}")
for series in series_list:
    print(f"ID: {series.id} | Title: {series.title} | Author: {series.author.email if series.author else 'NONE'} | Created: {series.created_at}")

if not series_list.exists():
    print("No series found!")
