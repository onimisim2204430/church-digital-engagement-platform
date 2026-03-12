# Generated migration to add Discipleship content type

from django.db import migrations


def add_discipleship_content_type(apps, schema_editor):
    """
    Add 'discipleship' as a new system content type.
    Follows the exact pattern used for announcement, sermon, and article.
    """
    PostContentType = apps.get_model('content', 'PostContentType')
    
    # Define discipleship type (matching existing system type pattern)
    discipleship_type = {
        'slug': 'discipleship',
        'name': 'Discipleship',
        'description': 'Discipleship resources and spiritual growth content',
        'is_system': True,
        'is_enabled': True,
        'sort_order': 4,  # After announcement (1), sermon (2), article (3)
    }
    
    # Create discipleship type (idempotent - won't duplicate if run multiple times)
    PostContentType.objects.get_or_create(
        slug=discipleship_type['slug'],
        defaults=discipleship_type
    )


def reverse_migration(apps, schema_editor):
    """
    Reverse migration - remove discipleship content type if no posts use it
    """
    PostContentType = apps.get_model('content', 'PostContentType')
    
    try:
        discipleship_type = PostContentType.objects.get(slug='discipleship')
        # Only delete if no posts reference it
        if not discipleship_type.posts.exists():
            discipleship_type.delete()
    except PostContentType.DoesNotExist:
        pass


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0007_interaction'),
    ]

    operations = [
        migrations.RunPython(add_discipleship_content_type, reverse_migration),
    ]
