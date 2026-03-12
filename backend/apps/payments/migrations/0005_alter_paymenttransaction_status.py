from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0004_payment_security_enhancements'),
    ]

    operations = [
        migrations.AlterField(
            model_name='paymenttransaction',
            name='status',
            field=models.CharField(
                choices=[
                    ('PENDING', 'Pending'),
                    ('PROCESSING', 'Processing'),
                    ('SUCCESS', 'Success'),
                    ('FAILED', 'Failed'),
                    ('CANCELLED', 'Cancelled'),
                ],
                db_index=True,
                default='PENDING',
                max_length=10,
            ),
        ),
    ]
