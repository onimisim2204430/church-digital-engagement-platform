"""
Interaction Serializers
Handles serialization for comments, questions, and flagged content
"""
from rest_framework import serializers
from .models import Interaction, InteractionType, InteractionStatus


class InteractionUserSerializer(serializers.Serializer):
    """Simplified user info for interactions"""
    id = serializers.IntegerField(read_only=True)
    email = serializers.EmailField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    role = serializers.CharField(read_only=True)


class InteractionPostSerializer(serializers.Serializer):
    """Simplified post info for interactions"""
    id = serializers.UUIDField(read_only=True)
    title = serializers.CharField(read_only=True)
    author = serializers.SerializerMethodField()
    author_name = serializers.SerializerMethodField()
    
    def get_author(self, obj):
        return obj.author.id if obj.author else None
    
    def get_author_name(self, obj):
        return f"{obj.author.first_name} {obj.author.last_name}".strip() or obj.author.email


class InteractionListSerializer(serializers.ModelSerializer):
    """List view for interactions table"""
    user = InteractionUserSerializer(read_only=True)
    post = InteractionPostSerializer(read_only=True)
    flagged_by_email = serializers.SerializerMethodField()
    responded_by_email = serializers.SerializerMethodField()
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Interaction
        fields = [
            'id', 'post', 'user', 'content', 'type', 'type_display',
            'is_question', 'status', 'status_display', 'is_flagged',
            'flagged_by_email', 'flagged_at', 'flag_reason',
            'responded_by_email', 'responded_at', 'is_hidden',
            'created_at', 'updated_at'
        ]
    
    def get_flagged_by_email(self, obj):
        return obj.flagged_by.email if obj.flagged_by else None
    
    def get_responded_by_email(self, obj):
        return obj.responded_by.email if obj.responded_by else None


class InteractionDetailSerializer(serializers.ModelSerializer):
    """Detailed view for modal - includes replies"""
    user = InteractionUserSerializer(read_only=True)
    post = InteractionPostSerializer(read_only=True)
    replies = serializers.SerializerMethodField()
    flagged_by = InteractionUserSerializer(read_only=True)
    responded_by = InteractionUserSerializer(read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    can_respond = serializers.SerializerMethodField()
    
    class Meta:
        model = Interaction
        fields = [
            'id', 'post', 'user', 'parent', 'content', 'type', 'type_display',
            'is_question', 'status', 'status_display', 'is_flagged',
            'flagged_by', 'flagged_at', 'flag_reason',
            'responded_by', 'responded_at', 'is_hidden', 'is_deleted',
            'created_at', 'updated_at', 'replies', 'can_respond'
        ]
    
    def get_replies(self, obj):
        """Get nested replies"""
        replies = obj.replies.filter(is_deleted=False).order_by('created_at')
        return InteractionListSerializer(replies, many=True).data
    
    def get_can_respond(self, obj):
        """Check if current user can respond"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        
        user = request.user
        
        # Admin can respond to anything
        if user.role == 'ADMIN':
            return True
        
        # Moderator can respond only to questions on their own posts
        if user.role == 'MODERATOR':
            return obj.is_question and obj.post.author_id == user.id
        
        return False


class InteractionCreateSerializer(serializers.ModelSerializer):
    """Create new interaction (comment/question)"""
    
    class Meta:
        model = Interaction
        fields = ['post', 'content', 'is_question', 'parent']
    
    def validate(self, data):
        """Validate interaction data"""
        post = data.get('post')
        
        # Ensure post is published
        if not post.is_published:
            raise serializers.ValidationError("Cannot comment on unpublished posts")
        
        return data
    
    def create(self, validated_data):
        """Create interaction with proper type"""
        user = self.context['request'].user
        is_question = validated_data.get('is_question', False)
        
        interaction = Interaction.objects.create(
            user=user,
            type=InteractionType.QUESTION if is_question else InteractionType.COMMENT,
            status=InteractionStatus.OPEN if is_question else InteractionStatus.CLOSED,
            **validated_data
        )
        
        return interaction


class InteractionResponseSerializer(serializers.Serializer):
    """Response to a question"""
    content = serializers.CharField(required=True)
    
    def validate_content(self, value):
        if not value.strip():
            raise serializers.ValidationError("Response cannot be empty")
        return value.strip()


class InteractionFlagSerializer(serializers.Serializer):
    """Flag an interaction"""
    reason = serializers.CharField(required=False, allow_blank=True)


class InteractionUpdateSerializer(serializers.ModelSerializer):
    """Update interaction status or content"""
    
    class Meta:
        model = Interaction
        fields = ['status', 'is_hidden']
    
    def validate_status(self, value):
        """Validate status transitions"""
        instance = self.instance
        
        # Questions can only transition to ANSWERED or CLOSED
        if instance.is_question:
            if value not in [InteractionStatus.ANSWERED, InteractionStatus.CLOSED]:
                raise serializers.ValidationError(
                    f"Questions can only be marked as ANSWERED or CLOSED, not {value}"
                )
        
        # Flagged items can transition to REVIEWED or ACTIONED
        if instance.is_flagged:
            if value not in [InteractionStatus.PENDING, InteractionStatus.REVIEWED, InteractionStatus.ACTIONED]:
                raise serializers.ValidationError(
                    f"Flagged items can only be marked as PENDING, REVIEWED, or ACTIONED"
                )
        
        return value
