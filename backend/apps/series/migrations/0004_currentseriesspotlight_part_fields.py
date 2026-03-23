from django.db import migrations, models


def _forward_populate_part_fields(apps, schema_editor):
    CurrentSeriesSpotlight = apps.get_model('series', 'CurrentSeriesSpotlight')

    for spotlight in CurrentSeriesSpotlight.objects.all():
        label = (spotlight.latest_part_label or '').lower()

        number = 4
        digits = ''.join(ch if ch.isdigit() else ' ' for ch in label).split()
        if digits:
            try:
                parsed = int(digits[0])
                if parsed > 0:
                    number = parsed
            except ValueError:
                number = 4

        status = 'AVAILABLE'
        if 'coming soon' in label:
            status = 'COMING_SOON'

        spotlight.latest_part_number = number
        spotlight.latest_part_status = status
        status_label = 'Coming Soon' if status == 'COMING_SOON' else 'Available'
        spotlight.latest_part_label = f'Part {number} {status_label}'
        spotlight.save(update_fields=['latest_part_number', 'latest_part_status', 'latest_part_label'])


class Migration(migrations.Migration):

    dependencies = [
        ('series', '0003_currentseriesspotlight'),
    ]

    operations = [
        migrations.AddField(
            model_name='currentseriesspotlight',
            name='latest_part_number',
            field=models.PositiveIntegerField(default=4, help_text='Manual part number shown on artwork badge'),
        ),
        migrations.AddField(
            model_name='currentseriesspotlight',
            name='latest_part_status',
            field=models.CharField(choices=[('AVAILABLE', 'Available'), ('COMING_SOON', 'Coming Soon')], default='AVAILABLE', help_text='Manual latest part status shown on artwork badge', max_length=20),
        ),
        migrations.AlterField(
            model_name='currentseriesspotlight',
            name='latest_part_label',
            field=models.CharField(default='Part 4 Available', help_text='Generated label shown on the artwork badge', max_length=120),
        ),
        migrations.RunPython(_forward_populate_part_fields, migrations.RunPython.noop),
    ]
