# Generated migration for Daily Word & Weekly Event features

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0016_post_category'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Add scheduled_date field to Post for daily word scheduling
        migrations.AddField(
            model_name='post',
            name='scheduled_date',
            field=models.DateField(
                blank=True,
                db_index=True,
                help_text='Date when this content is scheduled to appear (for daily words, etc.)',
                null=True
            ),
        ),
        
        # Add composite indexes for daily word queries
        migrations.AddIndex(
            model_name='post',
            index=models.Index(
                fields=['scheduled_date'],
                name='content_post_scheduled_date_idx'
            ),
        ),
        migrations.AddIndex(
            model_name='post',
            index=models.Index(
                fields=['scheduled_date', 'status'],
                name='content_post_scheduled_status_idx'
            ),
        ),
        migrations.AddIndex(
            model_name='post',
            index=models.Index(
                fields=['scheduled_date', 'is_deleted'],
                name='content_post_scheduled_deleted_idx'
            ),
        ),
        
        # Create new WeeklyEvent model for recurring weekly events
        migrations.CreateModel(
            name='WeeklyEvent',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('day_of_week', models.IntegerField(
                    choices=[(0, 'Monday'), (1, 'Tuesday'), (2, 'Wednesday'), (3, 'Thursday'), 
                             (4, 'Friday'), (5, 'Saturday'), (6, 'Sunday')],
                    db_index=True,
                    help_text='Day of week (0=Monday, 6=Sunday)',
                    unique=True
                )),
                ('title', models.CharField(help_text='Event name (e.g., \'Morning Prayer\', \'Study Circle\')', max_length=100)),
                ('time', models.CharField(help_text='Event time (e.g., \'8:00 AM\', \'Sunset\')', max_length=50)),
                ('description', models.TextField(blank=True, help_text='Optional description of the event')),
                ('sort_order', models.SmallIntegerField(default=0, help_text='Display order (lower numbers appear first)')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('linked_post', models.ForeignKey(
                    blank=True,
                    help_text='Optional: Daily word or other post for this day',
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='weekly_events',
                    to='content.post'
                )),
            ],
            options={
                'verbose_name': 'Weekly Event',
                'verbose_name_plural': 'Weekly Events',
                'ordering': ['day_of_week', 'sort_order'],
            },
        ),
        
        # Add index for WeeklyEvent
        migrations.AddIndex(
            model_name='weeklyevent',
            index=models.Index(fields=['day_of_week'], name='content_week_day_of_week_idx'),
        ),
        
        # Initialize default weekly events if none exist
        # This seed data will be loaded from a data migration
    ]
