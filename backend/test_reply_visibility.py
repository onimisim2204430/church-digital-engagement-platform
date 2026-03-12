"""
Test if the member can see the moderator's reply
"""
import os
import sys
import django
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.interactions.models import Comment
from apps.interactions.serializers import CommentSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

# Get the member who asked the question
user = User.objects.get(email='Trunk@church.com')
print(f"User: {user.email} (Role: {user.role})")
print()

# Get the question
question = Comment.objects.get(id='3bd5d1f9-d46d-42a7-ad28-4a3d7a05be88')
print(f"Question: {question.content[:80]}...")
print(f"Question Status: {question.question_status}")
print(f"Direct replies count: {question.replies.count()}")
print()

# Simulate API request context
class FakeRequest:
    pass

request = FakeRequest()
request.user = user

# Serialize the comment as the API would
serializer = CommentSerializer(question, context={'request': request})
data = serializer.data

print("=== API Response (what member sees) ===")
print(json.dumps(data, indent=2, default=str))
