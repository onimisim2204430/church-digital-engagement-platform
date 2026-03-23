from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('series', '0002_rename_series_seri_slug_idx_series_seri_slug_bda3af_idx_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='CurrentSeriesSpotlight',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('singleton_key', models.CharField(default='default', editable=False, help_text='Enforces a single spotlight configuration row', max_length=32, unique=True)),
                ('section_label', models.CharField(default='Current Series', help_text='Section tag text shown above the title', max_length=80)),
                ('latest_part_label', models.CharField(default='Part 4 Available', help_text='Manual label shown on the artwork badge (not auto-generated)', max_length=120)),
                ('description_override', models.TextField(blank=True, help_text='Optional custom description for public section')),
                ('cta_label', models.CharField(default='View Series Collection', help_text='CTA text shown on the left column', max_length=80)),
                ('is_active', models.BooleanField(default=True, help_text='Whether this spotlight config is active on public pages')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('series', models.ForeignKey(blank=True, help_text='Series selected for the Current Series section', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='current_spotlight_entries', to='series.series')),
                ('updated_by', models.ForeignKey(blank=True, help_text='Admin/moderator who last updated this spotlight config', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='updated_current_series_spotlights', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Current Series Spotlight',
                'verbose_name_plural': 'Current Series Spotlight',
            },
        ),
    ]
