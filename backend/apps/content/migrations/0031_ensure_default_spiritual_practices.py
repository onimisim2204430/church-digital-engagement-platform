from django.db import migrations


def ensure_default_spiritual_practices(apps, schema_editor):
    SpiritualPractice = apps.get_model('content', 'SpiritualPractice')

    defaults = [
        {
            'slug': 'breath-meditation',
            'title': 'Breath Meditation',
            'short_description': 'A 10-minute guided session for mindful presence and anxiety release.',
            'duration_label': '10 Min',
            'icon_name': 'self_improvement',
            'accent_color': 'accent-sage',
            'display_order': 1,
            'is_active': True,
        },
        {
            'slug': 'lectio-divina',
            'title': 'Lectio Divina',
            'short_description': 'A rhythmic reading of Psalm 23 for reflection and contemplation.',
            'duration_label': '5 Min Read',
            'icon_name': 'auto_stories',
            'accent_color': 'primary',
            'display_order': 2,
            'is_active': True,
        },
        {
            'slug': 'examen-journaling',
            'title': 'Examen Journaling',
            'short_description': "Prompts to review your day and notice God's presence in small moments.",
            'duration_label': 'Prompt',
            'icon_name': 'edit_note',
            'accent_color': 'accent-sand',
            'display_order': 3,
            'is_active': True,
        },
        {
            'slug': 'creation-walk',
            'title': 'Creation Walk',
            'short_description': 'An audio-guided walk connecting your movement with the natural world.',
            'duration_label': '15 Min',
            'icon_name': 'nature',
            'accent_color': 'accent-sage',
            'display_order': 4,
            'is_active': True,
        },
    ]

    for row in defaults:
        SpiritualPractice.objects.get_or_create(
            slug=row['slug'],
            defaults={
                'title': row['title'],
                'short_description': row['short_description'],
                'duration_label': row['duration_label'],
                'icon_name': row['icon_name'],
                'accent_color': row['accent_color'],
                'display_order': row['display_order'],
                'is_active': row['is_active'],
            },
        )


def noop_reverse(apps, schema_editor):
    return


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0030_spiritualpractice_card_limits'),
    ]

    operations = [
        migrations.RunPython(ensure_default_spiritual_practices, noop_reverse),
    ]
