from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0027_testimonial_video_url_and_optional_file'),
    ]

    operations = [
        migrations.CreateModel(
            name='SpiritualPractice',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('slug', models.SlugField(db_index=True, max_length=220, unique=True)),
                ('short_description', models.CharField(help_text='Short card description shown on homepage.', max_length=220)),
                ('duration_label', models.CharField(default='10 Min', help_text='Compact meta label (e.g., 10 Min, 5 Min Read).', max_length=50)),
                ('icon_name', models.CharField(choices=[('self_improvement', 'Self Improvement'), ('auto_stories', 'Auto Stories'), ('edit_note', 'Edit Note'), ('nature', 'Nature'), ('menu_book', 'Menu Book'), ('headphones', 'Headphones'), ('favorite', 'Favorite'), ('psychology', 'Psychology')], default='self_improvement', help_text='Icon token from the shared Icon mapping.', max_length=50)),
                ('accent_color', models.CharField(choices=[('accent-sage', 'Accent Sage'), ('primary', 'Primary'), ('accent-sand', 'Accent Sand')], default='accent-sage', help_text='Color token used by homepage card styling.', max_length=30)),
                ('full_content', models.TextField(blank=True, help_text='Extended content for the dedicated practice detail page.')),
                ('cover_image', models.ImageField(blank=True, help_text='Optional cover image for practices page/detail.', null=True, upload_to='spiritual_practices/covers/')),
                ('audio_url', models.URLField(blank=True, help_text='Optional audio guide URL.')),
                ('is_active', models.BooleanField(default=True, help_text='Whether this practice is visible to public endpoints.')),
                ('display_order', models.PositiveIntegerField(default=1, help_text='Display order for homepage carousel and practices pages.')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('updated_by', models.CharField(blank=True, help_text='Admin who last updated this practice.', max_length=100)),
            ],
            options={
                'verbose_name': 'Spiritual Practice',
                'verbose_name_plural': 'Spiritual Practices',
                'ordering': ['display_order', '-updated_at'],
                'indexes': [models.Index(fields=['is_active', 'display_order'], name='content_spi_is_acti_261b6f_idx'), models.Index(fields=['slug'], name='content_spi_slug_df9e4a_idx')],
            },
        ),
    ]
