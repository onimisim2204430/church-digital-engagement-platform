"""Serializers for notification API endpoints."""

from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id',
            'notification_type',
            'title',
            'message',
            'metadata',
            'is_read',
            'priority',
            'source_module',
            'created_at',
            'read_at',
        ]
        read_only_fields = fields
