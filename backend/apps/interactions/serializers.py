"""
Interaction Serializers
Production-grade comment system with threading
"""
from rest_framework import serializers
from .models import Comment, Reaction, Question, ReactionType


class CommentUserSerializer(serializers.Serializer):
    """User info for comments - read-only"""
    id = serializers.UUIDField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.EmailField()
    role = serializers.CharField()


class CommentSerializer(serializers.ModelSerializer):
    """Public comment serializer with nested replies (one level deep)"""
    user = CommentUserSerializer(read_only=True)
    replies = serializers.SerializerMethodField()
    reply_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Comment
        fields = [
            'id', 'post', 'user', 'content', 'parent', 'is_deleted',
            'is_question', 'question_status', 'answered_by', 'answered_at',
            'created_at', 'updated_at', 'replies', 'reply_count'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'is_deleted', 
                           'question_status', 'answered_by', 'answered_at']
    
    def get_replies(self, obj):
        """Get nested replies recursively (unlimited depth)"""
        replies = obj.replies.filter(is_deleted=False).order_by('created_at')
        
        # Filter questions in replies based on user role
        request = self.context.get('request')
        if request and request.user:
            user = request.user
            
            # If this is the user's own comment, show ALL replies (don't filter)
            if obj.user_id == user.id:
                pass  # Show all replies to your own comments/questions
            elif not user.is_authenticated:
                # Anonymous users cannot see question replies
                replies = replies.exclude(is_question=True)
            elif user.role not in ['ADMIN', 'MODERATOR']:
                # Regular members can only see their own question replies
                from django.db.models import Q
                replies = replies.exclude(
                    Q(is_question=True) & ~Q(user=user)
                )
            # Admins and Moderators see all question replies
        else:
            # No request context, hide all questions
            replies = replies.exclude(is_question=True)
        
        serializer = CommentSerializer(replies, many=True, context=self.context)
        return serializer.data
    
    def get_reply_count(self, obj):
        """Count non-deleted replies visible to current user"""
        replies = obj.replies.filter(is_deleted=False)
        
        # Filter questions in reply count based on user role
        request = self.context.get('request')
        if request and request.user:
            user = request.user
            
            # If this is the user's own comment, count ALL replies
            if obj.user_id == user.id:
                pass  # Count all replies to your own comments/questions
            elif not user.is_authenticated:
                # Anonymous users cannot see question replies
                replies = replies.exclude(is_question=True)
            elif user.role not in ['ADMIN', 'MODERATOR']:
                # Regular members can only see their own question replies
                from django.db.models import Q
                replies = replies.exclude(
                    Q(is_question=True) & ~Q(user=user)
                )
            # Admins and Moderators see all question replies
        else:
            # No request context, hide all questions
            replies = replies.exclude(is_question=True)
        
        return replies.count()
    
    def to_representation(self, instance):
        """Mask deleted comment content"""
        data = super().to_representation(instance)
        if instance.is_deleted:
            data['content'] = "This comment has been removed by moderation."
        return data


class CommentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating comments and replies"""
    
    class Meta:
        model = Comment
        fields = ['content', 'post', 'parent', 'is_question']
    
    def validate_content(self, value):
        """Validate comment content"""
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError("Comment cannot be empty.")
        
        if len(value) > 5000:
            raise serializers.ValidationError("Comment is too long (max 5000 characters).")
        
        return value.strip()
    
    def validate_post(self, value):
        """Validate post exists and is published"""
        if not value.is_published:
            raise serializers.ValidationError("Cannot comment on unpublished posts.")
        
        if value.is_deleted:
            raise serializers.ValidationError("Cannot comment on deleted posts.")
        
        return value
    
    def validate_parent(self, value):
        """Validate parent comment if replying"""
        if value is not None:
            if value.is_deleted:
                raise serializers.ValidationError("Cannot reply to deleted comments.")
        
        return value
    
    def validate(self, attrs):
        """Cross-field validation"""
        parent = attrs.get('parent')
        post = attrs.get('post')
        
        # If replying, ensure parent belongs to same post
        if parent and parent.post != post:
            raise serializers.ValidationError("Reply must belong to the same post as parent comment.")
        
        return attrs


class ReactionSerializer(serializers.ModelSerializer):
    """Serializer for Reaction model"""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = Reaction
        fields = ['id', 'post', 'user', 'user_name', 'reaction_type', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']


class ReactionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating reactions"""
    
    class Meta:
        model = Reaction
        fields = ['post', 'reaction_type']
    
    def validate_post(self, value):
        if not value.reactions_enabled:
            raise serializers.ValidationError("Reactions are disabled for this post.")
        if value.is_deleted:
            raise serializers.ValidationError("Cannot react to deleted post.")
        return value


class QuestionSerializer(serializers.ModelSerializer):
    """Serializer for Question model"""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    answered_by_name = serializers.CharField(source='answered_by.get_full_name', read_only=True)
    
    class Meta:
        model = Question
        fields = [
            'id', 'post', 'user', 'user_name', 'user_email', 'subject',
            'question_text', 'answer_text', 'answered_by', 'answered_by_name',
            'answered_at', 'is_closed', 'is_public', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user', 'answered_by', 'answered_at',
            'created_at', 'updated_at'
        ]


class QuestionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating questions"""
    
    class Meta:
        model = Question
        fields = ['post', 'subject', 'question_text']


class QuestionAnswerSerializer(serializers.Serializer):
    """Serializer for answering questions"""
    answer_text = serializers.CharField()
    is_public = serializers.BooleanField(default=False)


class ReactionSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating emoji reactions"""
    
    # Emoji to code mapping (server-side validation)
    EMOJI_MAP = {
        '👍': 'LIKE',
        '🙏': 'AMEN',
        '❤️': 'LOVE',
        '💡': 'INSIGHT',
        '🎉': 'PRAISE',
    }
    
    # Reverse mapping for display
    CODE_TO_EMOJI = {v: k for k, v in EMOJI_MAP.items()}
    
    class Meta:
        model = Reaction
        fields = ['emoji']
        
    emoji = serializers.CharField(
        max_length=10,
        help_text="Emoji: 👍, 🙏, ❤️, 💡, or 🎉"
    )
    
    def validate_emoji(self, value):
        """Validate emoji is in approved list"""
        if value not in self.EMOJI_MAP:
            allowed = ', '.join(self.EMOJI_MAP.keys())
            raise serializers.ValidationError(
                f"Invalid emoji. Allowed emojis: {allowed}"
            )
        return value
    
    def to_internal_value(self, data):
        """Convert emoji to internal code"""
        validated = super().to_internal_value(data)
        emoji = validated['emoji']
        # Map emoji to reaction_type code
        validated['reaction_type'] = self.EMOJI_MAP[emoji]
        return validated


class ReactionStatsSerializer(serializers.Serializer):
    """Serializer for reaction statistics with emoji display"""
    reactions = serializers.ListField(
        child=serializers.DictField()
    )
    user_reaction = serializers.CharField(allow_null=True)
