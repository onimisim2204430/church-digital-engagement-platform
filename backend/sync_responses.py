"""
Sync moderator responses from Interaction table to Comment table
"""
import os
import sys
import django

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.content.models import Interaction
from apps.interactions.models import Comment
from django.utils import timezone

print('Syncing moderator responses from Interaction to Comment table...\n')

# Find all replies in Interaction table
interactions = Interaction.objects.filter(parent__isnull=False)
print(f'Found {interactions.count()} replies in Interaction table\n')

synced_count = 0
skipped_count = 0

for reply in interactions:
    parent = reply.parent
    if not parent or not parent.is_question:
        continue
    
    print(f'Processing reply ID: {reply.id}')
    print(f'  Reply from: {reply.user.email} ({reply.user.role})')
    print(f'  Content: {reply.content[:50]}...')
    
    # Find the original question comment
    orig_comment = Comment.objects.filter(
        post=parent.post,
        user=parent.user,
        content=parent.content,
        is_question=True
    ).first()
    
    if orig_comment:
        print(f'  Found original question comment: {orig_comment.id}')
        
        # Check if reply already exists in Comment table
        existing = Comment.objects.filter(
            post=reply.post,
            user=reply.user,
            content=reply.content,
            parent=orig_comment
        ).first()
        
        if not existing:
            # Create the reply in Comment table
            new_comment = Comment.objects.create(
                post=reply.post,
                user=reply.user,
                parent=orig_comment,
                content=reply.content,
                is_question=False
            )
            
            # Mark question as answered
            orig_comment.question_status = 'ANSWERED'
            orig_comment.answered_by = reply.user
            orig_comment.answered_at = reply.created_at or timezone.now()
            orig_comment.save(update_fields=['question_status', 'answered_by', 'answered_at'])
            
            print(f'  ✓ Created Comment reply {new_comment.id}')
            print(f'  ✓ Marked question as ANSWERED')
            synced_count += 1
        else:
            print(f'  - Reply already exists in Comment table')
            skipped_count += 1
    else:
        print(f'  ✗ Original question comment not found')
        skipped_count += 1
    
    print()

print(f'\n=== Sync Complete ===')
print(f'Synced: {synced_count}')
print(f'Skipped: {skipped_count}')
