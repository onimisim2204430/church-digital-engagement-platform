import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.content.models import Draft

print("\nLATEST DRAFT DEBUG")
print("==================")

draft = Draft.objects.order_by('-last_autosave_at').first()

if not draft:
    print("No drafts found")
else:
    print("ID:", draft.id)
    print("Title:", draft.draft_title)
    print("Content type:", draft.content_type_id)
    print("Draft data keys:", list((draft.draft_data or {}).keys()))
    print("Draft data title:", draft.draft_data.get('title'))
    content = draft.draft_data.get('content')
    print("Draft data content length:", len(content) if content is not None else None)
    print("Draft data content preview:", (content or '')[:200])
    print("Draft data raw:", draft.draft_data)
