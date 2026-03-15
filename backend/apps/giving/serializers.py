"""Serializers for giving items API."""

from rest_framework import serializers
from .models import GivingItem


LEGACY_CATEGORY_TO_CANON = {
    'Tithes': 'tithe',
    'Offerings': 'offering',
    'Projects': 'project',
    'Fundraising': 'seed',
}

LEGACY_VISIBILITY_TO_CANON = {
    'PUBLIC': 'public',
    'MEMBERS_ONLY': 'members_only',
    'HIDDEN': 'hidden',
}

STATUS_TO_CANON = {
    'active': 'active',
    'draft': 'draft',
    'archived': 'archived',
    'paused': 'paused',
    'completed': 'completed',
}


def _normalize_category(value):
    if not isinstance(value, str):
        return value
    value_str = value.strip()
    if not value_str:
        return value_str

    if value_str in LEGACY_CATEGORY_TO_CANON:
        return LEGACY_CATEGORY_TO_CANON[value_str]

    lowered = value_str.lower()
    alias_map = {
        'tithes': 'tithe',
        'offerings': 'offering',
        'projects': 'project',
        'fundraising': 'seed',
    }
    return alias_map.get(lowered, lowered)


def _normalize_visibility(value):
    if not isinstance(value, str):
        return value
    value_str = value.strip()
    if not value_str:
        return value_str

    if value_str in LEGACY_VISIBILITY_TO_CANON:
        return LEGACY_VISIBILITY_TO_CANON[value_str]

    return value_str.lower()


def _normalize_status(value):
    if not isinstance(value, str):
        return value
    value_str = value.strip().lower()
    if not value_str:
        return value_str
    return STATUS_TO_CANON.get(value_str, value_str)


class GivingItemSerializer(serializers.ModelSerializer):
    """Full serializer for admin CRUD operations."""
    
    progress_percentage = serializers.ReadOnlyField()

    def to_internal_value(self, data):
        mutable_data = data.copy() if hasattr(data, 'copy') else dict(data)

        if 'category' in mutable_data:
            mutable_data['category'] = _normalize_category(mutable_data.get('category'))

        if 'visibility' in mutable_data:
            mutable_data['visibility'] = _normalize_visibility(mutable_data.get('visibility'))

        if 'status' in mutable_data:
            mutable_data['status'] = _normalize_status(mutable_data.get('status'))

        if mutable_data.get('deadline') == '':
            mutable_data['deadline'] = None

        return super().to_internal_value(mutable_data)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['category'] = _normalize_category(data.get('category'))
        data['visibility'] = _normalize_visibility(data.get('visibility'))
        data['status'] = _normalize_status(data.get('status'))
        return data
    
    class Meta:
        model = GivingItem
        fields = [
            'id',
            'category',
            'title',
            'description',
            'icon',
            'visibility',
            'status',
            'is_featured',
            'is_recurring_enabled',
            'suggested_amounts',
            'goal_amount',
            'raised_amount',
            'deadline',
            'verse',
            'cover_image',
            'display_order',
            'total_donations',
            'donor_count',
            'progress_percentage',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'raised_amount', 'total_donations', 'donor_count']


class PublicGivingItemSerializer(serializers.ModelSerializer):
    """Public-facing serializer - excludes draft/hidden items."""
    
    progress_percentage = serializers.ReadOnlyField()
    is_completed = serializers.SerializerMethodField()

    def get_is_completed(self, obj):
        """Determine if the giving item is completed (100% funded or manually set to completed)."""
        # Check if manually marked as completed
        if obj.status == 'completed':
            return True
        # Check if 100% funded
        if obj.progress_percentage is not None and obj.progress_percentage >= 100:
            return True
        return False

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['category'] = _normalize_category(data.get('category'))
        return data
    
    class Meta:
        model = GivingItem
        fields = [
            'id',
            'category',
            'title',
            'description',
            'icon',
            'is_featured',
            'is_recurring_enabled',
            'suggested_amounts',
            'goal_amount',
            'raised_amount',
            'deadline',
            'verse',
            'cover_image',
            'display_order',
            'progress_percentage',
            'is_completed',
        ]
