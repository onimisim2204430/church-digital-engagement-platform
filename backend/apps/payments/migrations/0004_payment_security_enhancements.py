# Generated migration for payment system security enhancements

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0003_paymentintent_paymentauditlog_and_more'),
    ]

    operations = [
        # Add amount_verified field to track whether amount was validated before success
        migrations.AddField(
            model_name='paymenttransaction',
            name='amount_verified',
            field=models.BooleanField(default=False, help_text='Amount validated against intent'),
        ),
        
        # Update reference field to include db_index (was already unique)
        migrations.AlterField(
            model_name='paymenttransaction',
            name='reference',
            field=models.CharField(db_index=True, max_length=100, unique=True),
        ),
        
        # Create indexes for better query performance
        migrations.AddIndex(
            model_name='paymenttransaction',
            index=models.Index(fields=['amount_verified', 'status'], name='pay_tx_amtv_st_idx'),
        ),
        migrations.AddIndex(
            model_name='paymentauditlog',
            index=models.Index(fields=['severity', '-created_at'], name='pay_aud_sev_cts_idx'),
        ),
    ]
