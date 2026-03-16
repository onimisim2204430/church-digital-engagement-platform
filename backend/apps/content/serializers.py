"""
Content Serializers
"""
from rest_framework import serializers
from django.utils import timezone
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import Post, PostType, PostStatus, PostContentType, Draft
from apps.series.models import Series


class PostContentTypeSerializer(serializers.ModelSerializer):
    """Serializer for PostContentType - read/list operations"""
    posts_count = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()
    
    class Meta:
        model = PostContentType
        fields = [
            'id', 'slug', 'name', 'description', 'is_system', 'is_enabled',
            'sort_order', 'posts_count', 'can_delete', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'posts_count', 'can_delete']
    
    def get_posts_count(self, obj):
        """Return count of posts using this content type"""
        return obj.posts.count()
    
    def get_can_delete(self, obj):
        """Can only delete custom types with no posts"""
        return not obj.is_system and obj.posts.count() == 0


class PostContentTypeCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating custom content types (Admin only)"""
    
    class Meta:
        model = PostContentType
        fields = ['slug', 'name', 'description', 'sort_order']
    
    def validate_slug(self, value):
        """Ensure slug is lowercase and valid"""
        if not value.islower():
            raise serializers.ValidationError("Slug must be lowercase")
        if not value.replace('_', '').replace('-', '').isalnum():
            raise serializers.ValidationError("Slug must contain only letters, numbers, hyphens, and underscores")
        return value
    
    def create(self, validated_data):
        # Custom types are always non-system and enabled by default
        validated_data['is_system'] = False
        validated_data['is_enabled'] = True
        return super().create(validated_data)


class PostContentTypeUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating content types (custom only, system types locked)"""
    
    class Meta:
        model = PostContentType
        fields = ['name', 'description', 'is_enabled', 'sort_order']
    
    def validate(self, attrs):
        """Prevent editing system types"""
        if self.instance and self.instance.is_system:
            # Only allow toggling is_enabled for system types (though we shouldn't allow this either per requirements)
            # Per requirements: System types cannot be modified in any way
            raise serializers.ValidationError("Cannot modify system content types")
        return attrs


class PostSerializer(serializers.ModelSerializer):
    """Serializer for Post model"""
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    author_email = serializers.EmailField(source='author.email', read_only=True)
    comments_count = serializers.SerializerMethodField()
    reactions_count = serializers.SerializerMethodField()
    content_type_name = serializers.CharField(source='get_content_type_name', read_only=True)
    content_type_slug = serializers.CharField(source='get_content_type_slug', read_only=True)
    series_title = serializers.CharField(source='series.title', read_only=True, allow_null=True)
    series_slug = serializers.CharField(source='series.slug', read_only=True, allow_null=True)
    
    class Meta:
        model = Post
        fields = [
            'id', 'title', 'content', 'post_type', 'content_type', 'content_type_name',
            'content_type_slug', 'author', 'author_name', 'author_email', 'is_published',
            'published_at', 'status', 'comments_enabled', 'reactions_enabled',
            'featured_image', 'video_url', 'audio_url', 'views_count', 'comments_count',
            'reactions_count', 'is_featured', 'featured_priority',
            'series', 'series_order', 'series_title', 'series_slug', 'category',
            'is_deleted', 'deleted_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'author', 'views_count', 'created_at', 'updated_at',
                           'comments_count', 'reactions_count', 'content_type_name', 
                           'content_type_slug', 'series_title', 'series_slug']
    
    def get_comments_count(self, obj):
        return obj.comments.filter(is_deleted=False).count()
    
    def get_reactions_count(self, obj):
        return obj.reactions.count()


class PostCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating posts"""
    status = serializers.ChoiceField(
        choices=PostStatus.choices,
        default=PostStatus.DRAFT,
        help_text="DRAFT or PUBLISHED"
    )
    # Accept either content_type (new FK) or post_type (legacy)
    content_type = serializers.PrimaryKeyRelatedField(
        queryset=PostContentType.objects.filter(is_enabled=True),
        required=False,
        allow_null=True
    )
    # Series relationship
    series = serializers.PrimaryKeyRelatedField(
        queryset=Series.objects.filter(is_deleted=False),
        required=False,
        allow_null=True,
        help_text="Series this post belongs to"
    )
    series_order = serializers.IntegerField(
        required=False,
        default=0,
        help_text="Part number within the series"
    )
    
    class Meta:
        model = Post
        fields = [
            'title', 'content', 'post_type', 'content_type', 'status', 'comments_enabled',
            'reactions_enabled', 'featured_image', 'video_url', 'audio_url',
            'is_featured', 'featured_priority', 'series', 'series_order', 'category'
        ]
    
    def create(self, validated_data):
        """
        Create post with proper timestamp handling
        - If status=PUBLISHED: Set published_at and is_published
        - If status=DRAFT: Leave published_at as None
        """
        status = validated_data.get('status', PostStatus.DRAFT)
        post = Post(**validated_data)
        
        if status == PostStatus.PUBLISHED:
            post.is_published = True
            post.published_at = timezone.now()
        
        post.save()
        return post


class PostUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating posts
    Protects published_at from being overwritten
    """
    series = serializers.PrimaryKeyRelatedField(
        queryset=Series.objects.filter(is_deleted=False),
        required=False,
        allow_null=True,
        help_text="Series this post belongs to"
    )
    
    class Meta:
        model = Post
        fields = [
            'title', 'content', 'post_type', 'comments_enabled',
            'reactions_enabled', 'featured_image', 'video_url', 'audio_url',
            'is_featured', 'featured_priority', 'series', 'series_order', 'category'
        ]
        # Explicitly exclude published_at from updates
        read_only_fields = ['published_at']
    
    def update(self, instance, validated_data):
        """
        Update post preserving published_at
        - Never overwrites published_at
        - updated_at is handled by Django's auto_now
        """
        # Update all allowed fields
        for field, value in validated_data.items():
            setattr(instance, field, value)
        
        instance.save()
        return instance


class PostPublishSerializer(serializers.Serializer):
    """Serializer for publishing/unpublishing posts"""
    is_published = serializers.BooleanField()


class PostListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing posts"""
    author = serializers.CharField(source='author.id', read_only=True)
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    author_email = serializers.CharField(source='author.email', read_only=True)
    comments_count = serializers.SerializerMethodField()
    reactions_count = serializers.SerializerMethodField()
    content_type_name = serializers.CharField(source='get_content_type_name', read_only=True)
    content_type_slug = serializers.CharField(source='get_content_type_slug', read_only=True)
    series_title = serializers.CharField(source='series.title', read_only=True, allow_null=True)
    
    class Meta:
        model = Post
        fields = [
            'id', 'title', 'content', 'post_type', 'content_type', 'content_type_name',
            'content_type_slug', 'author', 'author_name', 'author_email', 
            'is_published', 'published_at', 'status', 'featured_image', 'video_url', 'audio_url',
            'views_count', 'comments_count', 'reactions_count', 'is_featured', 'featured_priority', 
            'series_title', 'series_order', 'category', 'is_deleted', 'deleted_at', 'created_at', 'updated_at'
        ]
    
    def get_comments_count(self, obj):
        return obj.comments.filter(is_deleted=False).count()
    
    def get_reactions_count(self, obj):
        return obj.reactions.count()


class DraftSerializer(serializers.ModelSerializer):
    """Serializer for Draft model - list/retrieve operations"""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    content_type_name = serializers.CharField(source='content_type.name', read_only=True, allow_null=True)
    post_title = serializers.CharField(source='post.title', read_only=True, allow_null=True)
    preview = serializers.SerializerMethodField()
    time_since_save = serializers.SerializerMethodField()
    
    class Meta:
        model = Draft
        fields = [
            'id', 'user', 'user_name', 'user_email', 'post', 'post_title',
            'draft_title', 'draft_data', 'content_type', 'content_type_name',
            'version', 'is_published_draft', 'created_at', 'last_autosave_at',
            'preview', 'time_since_save'
        ]
        read_only_fields = ['id', 'user', 'version', 'created_at', 'last_autosave_at']
    
    def get_preview(self, obj):
        """Get content preview"""
        return obj.get_preview(max_length=100)
    
    def get_time_since_save(self, obj):
        """Human-readable time since last save"""
        from django.utils.timesince import timesince
        if obj.last_autosave_at:
            return timesince(obj.last_autosave_at) + " ago"
        return "Never"


class DraftCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating drafts"""
    content_type = serializers.PrimaryKeyRelatedField(
        queryset=PostContentType.objects.filter(is_enabled=True),
        required=False,
        allow_null=True
    )
    post = serializers.PrimaryKeyRelatedField(
        queryset=Post.objects.all(),
        required=False,
        allow_null=True,
        help_text="Linked post if editing existing content"
    )
    
    class Meta:
        model = Draft
        fields = ['post', 'draft_data', 'content_type']
    
    def validate_draft_data(self, value):
        """Ensure draft_data is a valid dictionary"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("draft_data must be a JSON object")
        return value
    
    def create(self, validated_data):
        """Create draft with current user"""
        # User is set by the view from request.user
        return super().create(validated_data)


class DraftUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating/auto-saving drafts"""
    content_type = serializers.PrimaryKeyRelatedField(
        queryset=PostContentType.objects.filter(is_enabled=True),
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = Draft
        fields = ['draft_data', 'content_type']
    
    def validate_draft_data(self, value):
        """Ensure draft_data is a valid dictionary"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("draft_data must be a JSON object")
        return value
    
    def update(self, instance, validated_data):
        """Update draft - version auto-increments in model's save()"""
        for field, value in validated_data.items():
            setattr(instance, field, value)
        
        # Extract title from draft_data for easier identification
        if 'draft_data' in validated_data and isinstance(validated_data['draft_data'], dict):
            title = validated_data['draft_data'].get('title', '')
            if title:
                instance.draft_title = title[:255]
        
        instance.save()
        return instance


class DraftListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing drafts"""
    content_type_name = serializers.CharField(source='content_type.name', read_only=True, allow_null=True)
    post_title = serializers.CharField(source='post.title', read_only=True, allow_null=True)
    preview = serializers.SerializerMethodField()
    time_since_save = serializers.SerializerMethodField()
    
    class Meta:
        model = Draft
        fields = [
            'id', 'draft_title', 'content_type_name', 'post_title',
            'version', 'last_autosave_at', 'preview', 'time_since_save'
        ]
    
    def get_preview(self, obj):
        """Get short content preview"""
        return obj.get_preview(max_length=80)
    
    def get_time_since_save(self, obj):
        """Human-readable time since last save"""
        from django.utils.timesince import timesince
        if obj.last_autosave_at:
            return timesince(obj.last_autosave_at) + " ago"
        return "Never"


# ============================================================================
# DAILY WORD SERIALIZERS (for devotional content with scheduled dates)
# ============================================================================

class DailyWordSerializer(serializers.ModelSerializer):
    """Serializer for daily word / devotional posts (read-only or list)"""
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    author_email = serializers.EmailField(source='author.email', read_only=True)
    day_of_week_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Post
        fields = [
            'id', 'title', 'content', 'scripture', 'prayer', 'scheduled_date', 'day_of_week_display',
            'author', 'author_name', 'author_email', 'status', 'published_at',
            'featured_image', 'audio_url', 'category', 'views_count',
            'comments_enabled', 'reactions_enabled', 'is_featured',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'author', 'views_count', 'created_at', 'updated_at']
    
    def get_day_of_week_display(self, obj):
        """Get day of week from scheduled_date"""
        if obj.scheduled_date:
            days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            return days[obj.scheduled_date.weekday()]
        return None


class DailyWordCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating daily word posts (admin only)"""
    
    class Meta:
        model = Post
        fields = [
            'title', 'content', 'scripture', 'prayer', 'scheduled_date', 'category',
            'featured_image', 'audio_url', 'comments_enabled', 'reactions_enabled',
            'is_featured', 'featured_priority'
        ]
    
    def validate(self, attrs):
        """Validate and enforce unique scheduled_date for devotional posts"""
        # Will be called via the viewset's create/update which should set content_type
        return attrs
    
    def create(self, validated_data):
        """Create a new daily word post"""
        from apps.users.models import User
        request = self.context.get('request')
        author = validated_data.pop('author', None) or (request.user if request else User.objects.first())
        
        # Set content_type to 'devotional' if not already set
        try:
            devotional_type = PostContentType.objects.get(slug='devotional')
        except PostContentType.DoesNotExist:
            # Fallback: create devotional type if it doesn't exist
            devotional_type = PostContentType.objects.create(
                slug='devotional',
                name='Devotional',
                is_system=True
            )
        
        post = Post.objects.create(
            author=author,
            content_type=devotional_type,
            post_type=PostType.DEVOTIONAL,
            status=PostStatus.DRAFT,
            **validated_data
        )
        return post
    
    def update(self, instance, validated_data):
        """Update an existing daily word post"""
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Ensure content_type is devotional
        try:
            devotional_type = PostContentType.objects.get(slug='devotional')
            instance.content_type = devotional_type
            instance.post_type = PostType.DEVOTIONAL
        except PostContentType.DoesNotExist:
            pass
        
        instance.full_clean()  # This will call Post.clean() and check uniqueness
        instance.save()
        return instance


class DailyWordConflictSerializer(serializers.Serializer):
    """Response serializer when a daily word conflict is detected"""
    has_conflict = serializers.BooleanField()
    existing_post = DailyWordSerializer(allow_null=True)
    message = serializers.CharField()


# ============================================================================
# WEEKLY EVENT SERIALIZERS
# ============================================================================

class WeeklyEventSerializer(serializers.ModelSerializer):
    """Serializer for weekly event model"""
    day_of_week_display = serializers.CharField(source='get_day_of_week_display', read_only=True)
    linked_post_title = serializers.CharField(source='linked_post.title', read_only=True, allow_null=True)
    linked_post_id = serializers.UUIDField(source='linked_post.id', read_only=True, allow_null=True)
    
    class Meta:
        from .models import WeeklyEvent
        model = WeeklyEvent
        fields = [
            'id', 'day_of_week', 'day_of_week_display', 'title', 'time',
            'description', 'linked_post', 'linked_post_id', 'linked_post_title',
            'sort_order', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class WeeklyEventCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating weekly events (admin only)"""
    
    class Meta:
        from .models import WeeklyEvent
        model = WeeklyEvent
        fields = [
            'day_of_week', 'title', 'time', 'description',
            'linked_post', 'sort_order'
        ]
    
    def validate_day_of_week(self, value):
        """Validate day of week is 0-6"""
        if not (0 <= value <= 6):
            raise serializers.ValidationError("Day of week must be 0-6 (0=Monday, 6=Sunday)")
        return value


class HeroSectionSerializer(serializers.ModelSerializer):
    """Serializer for reading HeroSection data"""
    
    class Meta:
        from .models import HeroSection
        model = HeroSection
        fields = [
            'id', 'title', 'description', 'label', 'image', 'image_alt_text',
            'button1_label', 'button1_url', 'button1_icon',
            'button2_label', 'button2_url', 'button2_icon',
            'hero_type', 'is_active', 'display_order',
            'created_at', 'updated_at', 'updated_by'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class HeroSectionCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating hero sections (admin only)"""
    
    class Meta:
        from .models import HeroSection
        model = HeroSection
        fields = [
            'title', 'description', 'label', 'image', 'image_alt_text',
            'button1_label', 'button1_url', 'button1_icon',
            'button2_label', 'button2_url', 'button2_icon',
            'hero_type', 'is_active', 'display_order', 'updated_by'
        ]
    
    def validate_button1_icon(self, value):
        """Validate button icons are valid icon names"""
        if value and len(value) > 50:
            raise serializers.ValidationError("Icon name too long")
        return value
    
    def validate_button2_icon(self, value):
        """Validate button icons are valid icon names"""
        if value and len(value) > 50:
            raise serializers.ValidationError("Icon name too long")
        return value
