# Generated manually for apps.content - add series fields to Post

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0008_add_discipleship_content_type'),  # Fixed to reference actual last migration
        ('series', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='post',
            name='series',
            field=models.ForeignKey(blank=True, help_text='Series this post belongs to (optional)', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='posts', to='series.series'),
        ),
        migrations.AddField(
            model_name='post',
            name='series_order',
            field=models.IntegerField(default=0, help_text='Order/part number within the series (e.g., Part 1, Part 2)'),
        ),
        migrations.AddIndex(
            model_name='post',
            index=models.Index(fields=['series', 'series_order'], name='content_post_series_idx'),
        ),
    ]
