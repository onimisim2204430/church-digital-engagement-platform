"""
Moderation Serializers
"""
from rest_framework import serializers
from .models import AuditLog, Report, ActionType


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for Audit Log"""
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_email', 'user_name', 'action_type',
            'description', 'ip_address', 'user_agent', 'metadata', 'created_at'
        ]
        read_only_fields = [
            'id', 'user', 'user_email', 'user_name', 'action_type',
            'description', 'ip_address', 'user_agent', 'metadata', 'created_at'
        ]


class ReportSerializer(serializers.ModelSerializer):
    """Serializer for Report"""
    reporter_name = serializers.CharField(source='reporter.get_full_name', read_only=True)
    reporter_email = serializers.EmailField(source='reporter.email', read_only=True)
    resolved_by_name = serializers.CharField(source='resolved_by.get_full_name', read_only=True)
    
    class Meta:
        model = Report
        fields = [
            'id', 'reporter', 'reporter_name', 'reporter_email',
            'content_type', 'object_id', 'reason', 'is_resolved',
            'resolved_by', 'resolved_by_name', 'resolved_at',
            'resolution_notes', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'reporter', 'resolved_by', 'resolved_at',
            'created_at', 'updated_at'
        ]


class ReportCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating reports"""
    
    class Meta:
        model = Report
        fields = ['content_type', 'object_id', 'reason']


class ReportResolveSerializer(serializers.Serializer):
    """Serializer for resolving reports"""
    resolution_notes = serializers.CharField(required=False, allow_blank=True)
