# Generated migration to convert system content types to custom
# This preserves all posts and data while making these types editable

from django.db import migrations


def convert_to_custom_types(apps, schema_editor):
    """
    Convert ALL system content types to custom (except 'announcement').
    This preserves all posts and data associated with these types.
    
    Makes all types editable and deletable for deployment flexibility.
    """
    PostContentType = apps.get_model('content', 'PostContentType')
    
    # Convert all system types to custom EXCEPT 'announcement' (which stays core/locked)
    types_converted = PostContentType.objects.filter(
        is_system=True
    ).exclude(
        slug='announcement'
    ).update(
        is_system=False
    )
    
    # Get list of converted types for logging
    remaining_system = PostContentType.objects.filter(is_system=True).values_list('slug', flat=True)
    
    print(f"[OK] Converted {types_converted} content types from system to custom")
    if remaining_system:
        print(f"  System types remaining: {', '.join(remaining_system)}")
    print("  All associated posts and data have been preserved")


def reverse_conversion(apps, schema_editor):
    """
    Reverse - convert back to system types if needed
    This is included for migration reversibility but should rarely be needed
    """
    PostContentType = apps.get_model('content', 'PostContentType')
    
    # Revert specific types to system
    types_to_revert = ['devotional', 'series', 'sermon', 'article', 'discipleship']
    PostContentType.objects.filter(slug__in=types_to_revert).update(is_system=True)


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0021_alter_post_status'),
    ]

    operations = [
        migrations.RunPython(convert_to_custom_types, reverse_conversion),
    ]
