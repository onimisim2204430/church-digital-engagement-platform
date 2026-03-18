from django.db import migrations, models


def trim_spiritual_practice_fields(apps, schema_editor):
    SpiritualPractice = apps.get_model('content', 'SpiritualPractice')

    for practice in SpiritualPractice.objects.all():
        title = (practice.title or '')[:20]
        short_description = (practice.short_description or '')[:80]

        updated_fields = []
        if practice.title != title:
            practice.title = title
            updated_fields.append('title')
        if practice.short_description != short_description:
            practice.short_description = short_description
            updated_fields.append('short_description')

        if updated_fields:
            practice.save(update_fields=updated_fields)


def noop_reverse(apps, schema_editor):
    return


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0029_seed_spiritual_practices_defaults'),
    ]

    operations = [
        migrations.RunPython(trim_spiritual_practice_fields, noop_reverse),
        migrations.AlterField(
            model_name='spiritualpractice',
            name='title',
            field=models.CharField(max_length=20),
        ),
        migrations.AlterField(
            model_name='spiritualpractice',
            name='short_description',
            field=models.CharField(help_text='Short card description shown on homepage.', max_length=80),
        ),
    ]
