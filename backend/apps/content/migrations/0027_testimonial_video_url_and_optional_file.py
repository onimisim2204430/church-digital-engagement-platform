from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0026_testimonial'),
    ]

    operations = [
        migrations.AddField(
            model_name='testimonial',
            name='video_url',
            field=models.URLField(blank=True, help_text='Optional external video URL (YouTube/Vimeo/etc.)'),
        ),
        migrations.AlterField(
            model_name='testimonial',
            name='video_file',
            field=models.FileField(blank=True, help_text='Optional uploaded video file (mp4/webm recommended)', null=True, upload_to='testimonials/videos/'),
        ),
    ]
