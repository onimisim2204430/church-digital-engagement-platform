#!/usr/bin/env python
import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model

User = get_user_model()
admin_user = User.objects.get(email='joelsam@church.com')

# Generate a valid JWT token
refresh = RefreshToken.for_user(admin_user)
access_token = str(refresh.access_token)

print(f"Access Token: {access_token}\n")

# Now test the API
import requests

headers = {
    'Authorization': f'Bearer {access_token}',
    'Content-Type': 'application/json'
}

response = requests.get('http://localhost:8000/api/v1/admin/series/', headers=headers)
print(f"Status Code: {response.status_code}")
print(f"Response:\n{json.dumps(response.json(), indent=2)}")
