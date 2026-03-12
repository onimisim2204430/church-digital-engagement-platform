"""
Email Campaign Serializers
"""
from rest_framework import serializers
from .models import EmailSubscription, EmailCampaign, EmailLog, CampaignStatus


class EmailSubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for Email Subscription"""
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = EmailSubscription
        fields = [
            'id', 'user', 'user_email', 'user_name', 'is_subscribed',
            'receive_sermons', 'receive_announcements', 'receive_devotionals',
            'receive_events', 'subscribed_at', 'unsubscribed_at'
        ]
        read_only_fields = ['id', 'user', 'subscribed_at', 'unsubscribed_at']


class EmailCampaignSerializer(serializers.ModelSerializer):
    """Serializer for Email Campaign"""
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    
    class Meta:
        model = EmailCampaign
        fields = [
            'id', 'created_by', 'created_by_name', 'created_by_email',
            'subject', 'content', 'html_content', 'send_to_all',
            'send_to_members_only', 'status', 'scheduled_at', 'sent_at',
            'total_recipients', 'total_sent', 'total_delivered',
            'total_opened', 'total_failed', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_by', 'status', 'sent_at', 'total_recipients',
            'total_sent', 'total_delivered', 'total_opened', 'total_failed',
            'created_at', 'updated_at'
        ]


class EmailCampaignCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating email campaigns"""
    
    class Meta:
        model = EmailCampaign
        fields = [
            'subject', 'content', 'html_content', 'send_to_all',
            'send_to_members_only', 'scheduled_at'
        ]
    
    def validate(self, data):
        if data.get('scheduled_at') and data['scheduled_at'] < serializers.DateTimeField().to_internal_value(
            serializers.DateTimeField().to_representation(
                serializers.DateTimeField().to_internal_value('now')
            )
        ):
            raise serializers.ValidationError("Scheduled time must be in the future.")
        return data


class EmailCampaignListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing campaigns"""
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = EmailCampaign
        fields = [
            'id', 'subject', 'created_by_name', 'status', 'total_recipients',
            'total_sent', 'total_delivered', 'total_opened', 'created_at',
            'sent_at'
        ]


class EmailLogSerializer(serializers.ModelSerializer):
    """Serializer for Email Log"""
    recipient_email = serializers.EmailField(source='recipient.email', read_only=True)
    campaign_subject = serializers.CharField(source='campaign.subject', read_only=True)
    
    class Meta:
        model = EmailLog
        fields = [
            'id', 'campaign', 'campaign_subject', 'recipient', 'recipient_email',
            'is_sent', 'is_delivered', 'is_opened', 'is_failed',
            'error_message', 'sent_at', 'delivered_at', 'opened_at', 'created_at'
        ]
        read_only_fields = [
            'id', 'campaign', 'campaign_subject', 'recipient', 'recipient_email',
            'is_sent', 'is_delivered', 'is_opened', 'is_failed',
            'error_message', 'sent_at', 'delivered_at', 'opened_at', 'created_at'
        ]
