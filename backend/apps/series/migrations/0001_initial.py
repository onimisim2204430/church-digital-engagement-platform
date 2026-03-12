# Generated manually for apps.series

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Series',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, help_text='Unique identifier for the series', primary_key=True, serialize=False)),
                ('title', models.CharField(help_text='Series title', max_length=255)),
                ('slug', models.SlugField(blank=True, help_text='URL-friendly identifier (auto-generated from title)', max_length=255, unique=True)),
                ('description', models.TextField(blank=True, help_text='Series description or overview')),
                ('cover_image', models.TextField(blank=True, help_text='Cover image URL or base64 data', null=True)),
                ('visibility', models.CharField(choices=[('PUBLIC', 'Public'), ('MEMBERS_ONLY', 'Members Only'), ('HIDDEN', 'Hidden')], default='PUBLIC', help_text='Who can see this series', max_length=20)),
                ('is_featured', models.BooleanField(default=False, help_text='Display on homepage as featured series')),
                ('featured_priority', models.IntegerField(default=0, help_text='Display order for featured series (higher = first)')),
                ('total_views', models.IntegerField(default=0, help_text='Total views across all posts in series')),
                ('is_deleted', models.BooleanField(default=False, help_text='Soft delete flag')),
                ('deleted_at', models.DateTimeField(blank=True, help_text='When the series was deleted', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='When the series was created')),
                ('updated_at', models.DateTimeField(auto_now=True, help_text='Last update time')),
                ('author', models.ForeignKey(help_text='Series creator', on_delete=django.db.models.deletion.CASCADE, related_name='created_series', to=settings.AUTH_USER_MODEL)),
                ('deleted_by', models.ForeignKey(blank=True, help_text='Who deleted this series', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='deleted_series', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Series',
                'verbose_name_plural': 'Series',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='series',
            index=models.Index(fields=['slug'], name='series_seri_slug_idx'),
        ),
        migrations.AddIndex(
            model_name='series',
            index=models.Index(fields=['author', '-created_at'], name='series_seri_author_idx'),
        ),
        migrations.AddIndex(
            model_name='series',
            index=models.Index(fields=['is_featured', '-featured_priority'], name='series_seri_is_feat_idx'),
        ),
        migrations.AddIndex(
            model_name='series',
            index=models.Index(fields=['visibility', '-created_at'], name='series_seri_visibil_idx'),
        ),
        migrations.AddIndex(
            model_name='series',
            index=models.Index(fields=['is_deleted'], name='series_seri_is_dele_idx'),
        ),
    ]
