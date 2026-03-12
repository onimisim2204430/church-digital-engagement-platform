#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

print("\n=== Users in Database ===")
users = User.objects.all()
for user in users:
    print(f"ID: {user.id} | Email: {user.email} | Name: {user.first_name} {user.last_name} | Is Admin: {user.is_admin} | Role: {user.role}")

if not users.exists():
    print("No users found!")
