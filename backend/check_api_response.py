#!/usr/bin/env python
import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
import requests

User = get_user_model()
user = User.objects.get(email='joelsam@church.com')

refresh = RefreshToken.for_user(user)
access_token = str(refresh.access_token)

headers = {
    'Authorization': f'Bearer {access_token}',
    'Content-Type': 'application/json'
}

response = requests.get('http://localhost:8000/api/v1/admin/series/', headers=headers)
data = response.json()

print("\n" + "="*80)
print("RAW API RESPONSE")
print("="*80)
print(f"Response Type: {type(data)}")
print(f"Top-level keys: {list(data.keys()) if isinstance(data, dict) else 'ARRAY'}")

print("\n" + "="*80)
print("RESPONSE STRUCTURE (first 500 chars of JSON):")
print("="*80)
print(json.dumps(data, indent=2)[:500])

print("\n" + "="*80)
print("FRONTEND NEEDS:")
print("="*80)
print("Frontend calls: const data = await seriesService.getAllSeries();")
print("Frontend expects: Array<Series>")
print("Actually receives:", type(data).__name__)

if isinstance(data, dict) and 'results' in data:
    print("\nISSUE FOUND: Response is paginated!")
    print("Frontend expects array, API returns {results: [...]}")
    print("FIX: Service needs to extract 'results' property")
    print(f"\nActual data length: {len(data['results'])}")
elif isinstance(data, list):
    print("\nOK: Response is already an array")
    print(f"Array length: {len(data)}")
else:
    print(f"\nUNEXPECTED: Response is {type(data)}")
