from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('giving', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='givingitem',
            name='category',
            field=models.CharField(
                choices=[
                    ('tithe', 'Tithes'),
                    ('offering', 'Offerings'),
                    ('project', 'Projects'),
                    ('mission', 'Missions'),
                    ('seed', 'Seed'),
                    ('other', 'Other'),
                ],
                db_index=True,
                default='offering',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='givingitem',
            name='visibility',
            field=models.CharField(
                choices=[
                    ('public', 'Public'),
                    ('members_only', 'Members Only'),
                    ('hidden', 'Hidden'),
                ],
                db_index=True,
                default='public',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='givingitem',
            name='status',
            field=models.CharField(
                choices=[
                    ('active', 'Active'),
                    ('archived', 'Archived'),
                    ('paused', 'Paused'),
                    ('completed', 'Completed'),
                    ('draft', 'Draft'),
                ],
                db_index=True,
                default='draft',
                max_length=20,
            ),
        ),
    ]
