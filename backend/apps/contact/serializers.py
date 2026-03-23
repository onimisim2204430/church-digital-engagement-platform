"""
Contact serializers
"""
from rest_framework import serializers
from .models import ContactMessage, ContactReply, ContactCategory, ContactStatus


class ContactMessageCreateSerializer(serializers.ModelSerializer):
    """Used by the public endpoint for both anonymous and authenticated submissions."""

    class Meta:
        model = ContactMessage
        fields = [
            'sender_name', 'sender_email', 'sender_phone',
            'category', 'subject', 'message',
            'preferred_contact', 'consent',
        ]

    def validate_sender_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Name is required.")
        if len(value) > 200:
            raise serializers.ValidationError("Name is too long.")
        return value

    def validate_message(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Message cannot be empty.")
        if len(value) > 5000:
            raise serializers.ValidationError("Message is too long (max 5000 characters).")
        return value

    def validate_subject(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Subject is required.")
        return value

    def validate_consent(self, value):
        if not value:
            raise serializers.ValidationError("You must agree to the privacy policy to submit.")
        return value

    def validate_category(self, value):
        valid = [c[0] for c in ContactCategory.choices]
        if value not in valid:
            raise serializers.ValidationError(f"Invalid category. Choose from: {', '.join(valid)}")
        return value


class ContactReplySerializer(serializers.ModelSerializer):
    replied_by_name = serializers.CharField(source='replied_by.get_full_name', read_only=True)

    class Meta:
        model = ContactReply
        fields = ['id', 'reply_text', 'replied_by', 'replied_by_name', 'email_sent', 'email_sent_at', 'created_at']
        read_only_fields = ['id', 'replied_by', 'replied_by_name', 'email_sent', 'email_sent_at', 'created_at']


class ContactMessageListSerializer(serializers.ModelSerializer):
    reply_count = serializers.SerializerMethodField()
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)

    class Meta:
        model = ContactMessage
        fields = [
            'id', 'sender_name', 'sender_email', 'sender_phone',
            'category', 'subject', 'status',
            'assigned_to', 'assigned_to_name',
            'notification_sent', 'admin_email_sent',
            'reply_count', 'created_at', 'updated_at', 'replied_at',
        ]

    def get_reply_count(self, obj):
        return obj.replies.count()


class ContactMessageDetailSerializer(serializers.ModelSerializer):
    replies = ContactReplySerializer(many=True, read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    user_id = serializers.UUIDField(source='user.id', read_only=True, allow_null=True)

    class Meta:
        model = ContactMessage
        fields = [
            'id', 'sender_name', 'sender_email', 'sender_phone',
            'user_id', 'category', 'subject', 'message',
            'preferred_contact', 'consent', 'status',
            'assigned_to', 'assigned_to_name', 'admin_notes',
            'notification_sent', 'admin_email_sent',
            'replies', 'created_at', 'updated_at', 'replied_at',
        ]
        read_only_fields = [
            'id', 'user_id', 'sender_name', 'sender_email', 'sender_phone',
            'consent', 'notification_sent', 'admin_email_sent',
            'created_at', 'updated_at', 'replied_at',
        ]


class AdminReplyCreateSerializer(serializers.Serializer):
    reply_text = serializers.CharField(min_length=1, max_length=10000)
