# Generated migration for analytics app

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='PageView',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('page', models.CharField(choices=[('home', 'Home'), ('posts', 'Posts'), ('series', 'Series'), ('devotional', 'Devotional'), ('give', 'Giving'), ('other', 'Other')], default='other', max_length=50)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.TextField(blank=True, null=True)),
                ('session_id', models.CharField(blank=True, max_length=40, null=True)),
                ('device_fingerprint', models.CharField(blank=True, db_index=True, max_length=64, null=True)),
                ('timestamp', models.DateTimeField(default=django.utils.timezone.now, db_index=True)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'analytics_pageview',
                'ordering': ['-timestamp'],
            },
        ),
        migrations.CreateModel(
            name='AnalyticsSnapshot',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField(auto_now_add=True, db_index=True)),
                ('total_page_views', models.IntegerField(default=0)),
                ('unique_visitors', models.IntegerField(default=0)),
                ('page_breakdown', models.JSONField(default=dict)),
            ],
            options={
                'db_table': 'analytics_snapshot',
                'ordering': ['-date'],
            },
        ),
        migrations.AddIndex(
            model_name='pageview',
            index=models.Index(fields=['timestamp', 'page'], name='analytics_p_timestmp_idx'),
        ),
        migrations.AddIndex(
            model_name='pageview',
            index=models.Index(fields=['device_fingerprint', 'timestamp'], name='analytics_p_device_f_idx'),
        ),
    ]
