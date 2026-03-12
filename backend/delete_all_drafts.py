import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.content.models import Draft

def delete_all_drafts():
    """Delete all drafts from the database"""
    drafts = Draft.objects.all()
    count = drafts.count()
    
    print(f"\n{'='*80}")
    print(f"DELETING ALL DRAFTS")
    print(f"{'='*80}\n")
    
    print(f"Found {count} drafts to delete...\n")
    
    for draft in drafts:
        print(f"Deleting draft: {draft.id}")
        print(f"  Title: {draft.draft_data.get('title', 'N/A')}")
        print(f"  User: {draft.user.email}")
        print(f"  Content length: {len(draft.draft_data.get('content', ''))}")
        draft.delete()
    
    print(f"\n✅ Successfully deleted {count} drafts!")
    print(f"{'='*80}\n")

if __name__ == '__main__':
    delete_all_drafts()
