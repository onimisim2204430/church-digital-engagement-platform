from django.db import migrations, models


def resequence_spiritual_practice_orders(apps, schema_editor):
    SpiritualPractice = apps.get_model('content', 'SpiritualPractice')

    rows = list(
        SpiritualPractice.objects.all().order_by('display_order', 'created_at', 'id')
    )

    for index, row in enumerate(rows, start=1):
        if row.display_order != index:
            row.display_order = index
            row.save(update_fields=['display_order'])


def noop_reverse(apps, schema_editor):
    return


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0031_ensure_default_spiritual_practices'),
    ]

    operations = [
        migrations.RunPython(resequence_spiritual_practice_orders, noop_reverse),
        migrations.AddConstraint(
            model_name='spiritualpractice',
            constraint=models.UniqueConstraint(
                fields=('display_order',),
                name='content_spiritualpractice_unique_display_order',
            ),
        ),
    ]
