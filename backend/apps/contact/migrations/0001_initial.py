"""
Initial migration for the contact app.
"""
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
            name='ContactMessage',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('sender_name', models.CharField(max_length=200)),
                ('sender_email', models.EmailField()),
                ('sender_phone', models.CharField(blank=True, max_length=30)),
                ('category', models.CharField(
                    choices=[
                        ('GENERAL', 'General'),
                        ('SUPPORT', 'Support'),
                        ('PRAYER', 'Prayer'),
                        ('TECHNICAL', 'Technical'),
                        ('FINANCE', 'Finance'),
                        ('PARTNERSHIP', 'Partnership'),
                    ],
                    default='GENERAL',
                    max_length=20,
                )),
                ('subject', models.CharField(max_length=300)),
                ('message', models.TextField()),
                ('preferred_contact', models.CharField(
                    blank=True,
                    choices=[('email', 'Email'), ('phone', 'Phone')],
                    default='email',
                    max_length=10,
                )),
                ('consent', models.BooleanField(default=False)),
                ('status', models.CharField(
                    choices=[
                        ('NEW', 'New'),
                        ('IN_PROGRESS', 'In Progress'),
                        ('REPLIED', 'Replied'),
                        ('CLOSED', 'Closed'),
                    ],
                    db_index=True,
                    default='NEW',
                    max_length=15,
                )),
                ('admin_notes', models.TextField(blank=True)),
                ('notification_sent', models.BooleanField(default=False)),
                ('admin_email_sent', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('replied_at', models.DateTimeField(blank=True, null=True)),
                ('user', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='contact_messages',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('assigned_to', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='assigned_contact_messages',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='ContactReply',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('reply_text', models.TextField()),
                ('email_sent', models.BooleanField(default=False)),
                ('email_sent_at', models.DateTimeField(blank=True, null=True)),
                ('email_error', models.CharField(blank=True, max_length=500)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('contact_message', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='replies',
                    to='contact.contactmessage',
                )),
                ('replied_by', models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='contact_replies',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='contactmessage',
            index=models.Index(fields=['status', '-created_at'], name='contact_sta_idx'),
        ),
        migrations.AddIndex(
            model_name='contactmessage',
            index=models.Index(fields=['category', '-created_at'], name='contact_cat_idx'),
        ),
        migrations.AddIndex(
            model_name='contactmessage',
            index=models.Index(fields=['sender_email'], name='contact_email_idx'),
        ),
    ]
