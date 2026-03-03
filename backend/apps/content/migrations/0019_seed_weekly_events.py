# Data migration to seed initial weekly events

from django.db import migrations


def seed_weekly_events(apps, schema_editor):
    """Seed initial weekly events"""
    WeeklyEvent = apps.get_model('content', 'WeeklyEvent')
    
    events_data = [
        {'day_of_week': 0, 'title': 'Morning Prayer', 'time': '8:00 AM', 'sort_order': 0},
        {'day_of_week': 1, 'title': 'Study Circle', 'time': '7:00 PM', 'sort_order': 0},
        {'day_of_week': 2, 'title': 'Restorative', 'time': '12:00 PM', 'sort_order': 0},
        {'day_of_week': 3, 'title': 'Youth Hub', 'time': '6:30 PM', 'sort_order': 0},
        {'day_of_week': 4, 'title': 'Shabbat Eve', 'time': 'Sunset', 'sort_order': 0},
        {'day_of_week': 5, 'title': 'Sabbath Hike', 'time': '10:00 AM', 'sort_order': 0},
        {'day_of_week': 6, 'title': 'Live Stream', 'time': '10:00 AM', 'sort_order': 0},
    ]
    
    for event_data in events_data:
        # Only create if doesn't exist
        WeeklyEvent.objects.get_or_create(
            day_of_week=event_data['day_of_week'],
            defaults={
                'title': event_data['title'],
                'time': event_data['time'],
                'sort_order': event_data['sort_order']
            }
        )


def reverse_seed(apps, schema_editor):
    """Delete seeded events"""
    WeeklyEvent = apps.get_model('content', 'WeeklyEvent')
    # Delete events that match our seed data (be careful to only delete what we created)
    WeeklyEvent.objects.filter(day_of_week__in=range(0, 7)).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0018_rename_content_post_scheduled_date_idx_content_pos_schedul_6395fa_idx_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_weekly_events, reverse_seed),
    ]
