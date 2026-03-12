import os
import django
from datetime import datetime

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.content.models import Draft, PostContentType
from apps.users.models import User

def create_test_draft():
    """Create a test draft with content"""
    print(f"\n{'='*80}")
    print(f"CREATING TEST DRAFT WITH CONTENT")
    print(f"{'='*80}\n")
    
    # Get the user (joelsam@church.com)
    try:
        user = User.objects.get(email='joelsam@church.com')
        print(f"✅ Found user: {user.email} (ID: {user.id})")
    except User.DoesNotExist:
        print("❌ User joelsam@church.com not found!")
        return
    
    # Get Series PostContentType
    try:
        series_ct = PostContentType.objects.get(name='Series')
        print(f"✅ Found Series PostContentType (ID: {series_ct.id})")
    except PostContentType.DoesNotExist:
        print("❌ Series PostContentType not found!")
        print("Available content types:")
        for ct in PostContentType.objects.all():
            print(f"  - {ct.name} (ID: {ct.id})")
        return
    
    # Create the draft with content
    test_content = """
<h2>This is a Test Draft - Manually Created</h2>
<p>This draft was created manually using a Python script to test the edit functionality.</p>
<p>If you can see this content when clicking "Edit" from the drafts list, then the fix is working correctly!</p>
<p><strong>Important points to verify:</strong></p>
<ul>
    <li>Content should load immediately when clicking Edit</li>
    <li>Title should be visible in the form</li>
    <li>Auto-save should continue working after loading</li>
</ul>
<p>Created at: {}</p>
""".format(datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    
    draft_data = {
        'title': 'TEST DRAFT - Manual Creation',
        'content': test_content.strip(),
        'status': 'DRAFT',
        'comments_enabled': True,
        'reactions_enabled': True,
        'published_at': None,
        'tags': [],
        'featured_image': None,
    }
    
    draft = Draft.objects.create(
        user=user,
        content_type=series_ct,
        draft_data=draft_data,
        version=1
    )
    
    print(f"\n✅ DRAFT CREATED SUCCESSFULLY!")
    print(f"{'='*80}")
    print(f"Draft ID: {draft.id}")
    print(f"Title: {draft.draft_data['title']}")
    print(f"Content length: {len(draft.draft_data['content'])} characters")
    print(f"Content preview: {draft.draft_data['content'][:100]}...")
    print(f"User: {draft.user.email}")
    print(f"Content Type: Series")
    print(f"Version: {draft.version}")
    print(f"Created: {draft.created_at}")
    print(f"{'='*80}\n")
    
    print("📝 Now go to Content → Drafts and click Edit on this draft!")
    print("   The content should load correctly.\n")

if __name__ == '__main__':
    create_test_draft()
