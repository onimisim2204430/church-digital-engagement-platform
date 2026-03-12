import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.content.models import Draft

print("\nALL DRAFTS IN DATABASE")
print("=" * 80)

drafts = Draft.objects.all().order_by('-last_autosave_at')

if not drafts:
    print("No drafts found")
else:
    for i, draft in enumerate(drafts, 1):
        print(f"\nDraft #{i}:")
        print(f"  ID: {draft.id}")
        print(f"  Title: {draft.draft_title}")
        print(f"  User: {draft.user.email}")
        print(f"  Created: {draft.created_at}")
        print(f"  Last saved: {draft.last_autosave_at}")
        print(f"  Version: {draft.version}")
        content = draft.draft_data.get('content', '')
        print(f"  Content length: {len(content)}")
        print(f"  Content preview: '{content[:100]}'")
        print(f"  Content type: {draft.content_type_id}")
