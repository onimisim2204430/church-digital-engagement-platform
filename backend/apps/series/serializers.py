"""
Series Serializers
"""
from rest_framework import serializers
from django.utils import timezone
from .models import (
    Series,
    SeriesVisibility,
    CurrentSeriesSpotlight,
    SeriesSubscription,
    SeriesSubscriptionStatus,
    SeriesAnnouncementRequest,
    SeriesAnnouncementRequestStatus,
)
from apps.content.models import Post
from apps.users.models import UserRole


class SeriesAuthorSerializer(serializers.Serializer):
    """Nested serializer for the series author field"""
    id = serializers.UUIDField(source='pk', read_only=True)
    full_name = serializers.SerializerMethodField()
    profile_picture = serializers.SerializerMethodField()

    def get_full_name(self, obj):
        name = obj.get_full_name()
        return name if name.strip() else obj.email

    def get_profile_picture(self, obj):
        request = self.context.get('request')
        if obj.profile_picture:
            url = obj.profile_picture.url
            if request:
                return request.build_absolute_uri(url)
            return url
        return None


class SeriesSerializer(serializers.ModelSerializer):
    """Serializer for Series listing and detail views"""
    author = SeriesAuthorSerializer(read_only=True)
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    author_email = serializers.EmailField(source='author.email', read_only=True)
    post_count = serializers.SerializerMethodField()
    published_post_count = serializers.SerializerMethodField()
    date_range = serializers.SerializerMethodField()
    
    class Meta:
        model = Series
        fields = [
            'id', 'title', 'slug', 'description', 'cover_image',
            'author', 'author_name', 'author_email',
            'visibility', 'is_featured', 'featured_priority',
            'total_views', 'post_count', 'published_post_count',
            'date_range', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'slug', 'total_views', 'created_at', 'updated_at']
    
    def get_post_count(self, obj):
        return obj.get_post_count()
    
    def get_published_post_count(self, obj):
        return obj.get_published_post_count()
    
    def get_date_range(self, obj):
        return obj.get_date_range()


class SeriesCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a series"""
    
    class Meta:
        model = Series
        fields = [
            'title', 'description', 'cover_image',
            'visibility', 'is_featured', 'featured_priority'
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)

        if attrs.get('is_featured'):
            featured_count = Series.objects.filter(is_deleted=False, is_featured=True).count()
            if featured_count >= 3:
                raise serializers.ValidationError({
                    'is_featured': 'Only 3 series can be featured. Use the Featured Series selector to update the set.'
                })

        return attrs
    
    def create(self, validated_data):
        # Author is set in the view
        return super().create(validated_data)


class SeriesUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating a series"""
    
    class Meta:
        model = Series
        fields = [
            'title', 'description', 'cover_image',
            'visibility', 'is_featured', 'featured_priority'
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)

        requested_featured = attrs.get('is_featured')
        instance = getattr(self, 'instance', None)

        if requested_featured is True and instance and not instance.is_featured:
            featured_count = Series.objects.filter(is_deleted=False, is_featured=True).exclude(pk=instance.pk).count()
            if featured_count >= 3:
                raise serializers.ValidationError({
                    'is_featured': 'Only 3 series can be featured. Use the Featured Series selector to update the set.'
                })

        return attrs


class SetFeaturedSeriesSerializer(serializers.Serializer):
    """Validate payload for atomic featured series selection."""
    series_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=3,
        max_length=3,
        allow_empty=False,
        required=True,
    )

    def validate_series_ids(self, value):
        if len(set(value)) != len(value):
            raise serializers.ValidationError('Duplicate series IDs are not allowed.')
        return value


class CurrentSeriesSpotlightSerializer(serializers.ModelSerializer):
    """Serializer for current series spotlight settings."""
    series = SeriesSerializer(read_only=True)
    series_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    latest_part_status = serializers.ChoiceField(
        choices=CurrentSeriesSpotlight.LatestPartStatus.choices,
        required=False,
    )

    class Meta:
        model = CurrentSeriesSpotlight
        fields = [
            'id',
            'series',
            'series_id',
            'section_label',
            'latest_part_number',
            'latest_part_status',
            'latest_part_label',
            'description_override',
            'cta_label',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'series', 'latest_part_label']

    def validate_latest_part_number(self, value):
        if value is None:
            return value
        if value < 1:
            raise serializers.ValidationError('Latest part number must be at least 1.')
        return value

    def validate_series_id(self, value):
        if value is None:
            return value

        try:
            series = Series.objects.get(pk=value, is_deleted=False)
        except Series.DoesNotExist as exc:
            raise serializers.ValidationError('Selected series does not exist.') from exc

        request = self.context.get('request')
        if request and request.user.role == UserRole.MODERATOR and series.author != request.user:
            raise serializers.ValidationError('You can only spotlight series that you created.')

        return value

    def update(self, instance, validated_data):
        series_id = validated_data.pop('series_id', serializers.empty)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if series_id is not serializers.empty:
            if series_id is None:
                instance.series = None
            else:
                instance.series = Series.objects.get(pk=series_id, is_deleted=False)

        instance.save()
        return instance


class SeriesPostSerializer(serializers.ModelSerializer):
    """Minimal serializer for posts in a series"""
    content_type_name = serializers.CharField(source='get_content_type_name', read_only=True)
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    excerpt = serializers.SerializerMethodField()
    
    class Meta:
        model = Post
        fields = [
            'id', 'title', 'content_type_name', 'author_name',
            'series_order', 'is_published', 'published_at',
            'views_count', 'featured_image', 'video_url', 'audio_url',
            'created_at', 'excerpt'
        ]
        read_only_fields = fields
    
    def get_excerpt(self, obj):
        """Return a plain-text excerpt from the post content (first 160 chars)"""
        import re
        text = re.sub(r'<[^>]+>', '', obj.content or '')
        text = text.strip()
        if len(text) > 160:
            return text[:160].rsplit(' ', 1)[0] + '…'
        return text


class SeriesDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer with all posts in the series"""
    author = SeriesAuthorSerializer(read_only=True)
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    author_email = serializers.EmailField(source='author.email', read_only=True)
    posts = serializers.SerializerMethodField()
    post_count = serializers.SerializerMethodField()
    published_post_count = serializers.SerializerMethodField()
    date_range = serializers.SerializerMethodField()
    next_part_number = serializers.SerializerMethodField()
    is_subscribed = serializers.SerializerMethodField()
    
    class Meta:
        model = Series
        fields = [
            'id', 'title', 'slug', 'description', 'cover_image',
            'author', 'author_name', 'author_email',
            'visibility', 'is_featured', 'featured_priority',
            'total_views', 'post_count', 'published_post_count',
            'date_range', 'next_part_number', 'is_subscribed', 'posts',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'slug', 'total_views', 'created_at', 'updated_at']

    def get_is_subscribed(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return SeriesSubscription.objects.filter(
                series=obj,
                user=request.user,
                status=SeriesSubscriptionStatus.ACTIVE
            ).exists()
        return False
    
    def get_posts(self, obj):
        posts = obj.posts.filter(is_deleted=False).order_by('series_order', 'created_at')
        return SeriesPostSerializer(posts, many=True).data
    
    def get_post_count(self, obj):
        return obj.get_post_count()
    
    def get_published_post_count(self, obj):
        return obj.get_published_post_count()
    
    def get_date_range(self, obj):
        return obj.get_date_range()
    
    def get_next_part_number(self, obj):
        return obj.get_next_part_number()


class AddPostToSeriesSerializer(serializers.Serializer):
    """Serializer for adding a post to a series"""
    post_id = serializers.UUIDField(required=True)
    series_order = serializers.IntegerField(required=False, allow_null=True)
    
    def validate_post_id(self, value):
        """Ensure post exists and is not deleted"""
        try:
            post = Post.objects.get(id=value, is_deleted=False)
        except Post.DoesNotExist:
            raise serializers.ValidationError("Post not found")
        return value


class RemovePostFromSeriesSerializer(serializers.Serializer):
    """Serializer for removing a post from a series"""
    post_id = serializers.UUIDField(required=True)
    
    def validate_post_id(self, value):
        """Ensure post exists"""
        try:
            post = Post.objects.get(id=value)
        except Post.DoesNotExist:
            raise serializers.ValidationError("Post not found")
        return value


class ReorderSeriesPostsSerializer(serializers.Serializer):
    """Serializer for reordering posts in a series"""
    post_orders = serializers.ListField(
        child=serializers.DictField(
            child=serializers.CharField()
        ),
        required=True
    )
    
    def validate_post_orders(self, value):
        """Validate that all posts exist and have order numbers"""
        for item in value:
            if 'post_id' not in item or 'order' not in item:
                raise serializers.ValidationError(
                    "Each item must have 'post_id' and 'order' fields"
                )
            
            try:
                Post.objects.get(id=item['post_id'])
            except Post.DoesNotExist:
                raise serializers.ValidationError(f"Post {item['post_id']} not found")
        
        return value


class SeriesSubscriptionSerializer(serializers.ModelSerializer):
    series_title = serializers.CharField(source='series.title', read_only=True)

    class Meta:
        model = SeriesSubscription
        fields = [
            'id',
            'series',
            'series_title',
            'email',
            'status',
            'verified_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields


class CreateSeriesSubscriptionSerializer(serializers.Serializer):
    series_slug = serializers.SlugField(required=True)
    email = serializers.EmailField(required=False)


class VerifySeriesSubscriptionSerializer(serializers.Serializer):
    token = serializers.CharField(required=True, trim_whitespace=True)


class UnsubscribeSeriesSubscriptionSerializer(serializers.Serializer):
    token = serializers.UUIDField(required=True)


class SeriesAnnouncementRequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SeriesAnnouncementRequest
        fields = ['series', 'request_type', 'title', 'message', 'related_post']

    def validate_series(self, value):
        request = self.context['request']
        if request.user.role == UserRole.MODERATOR and value.author != request.user:
            raise serializers.ValidationError('You can only send updates for series that you created.')
        return value

    def validate_message(self, value):
        clean_value = (value or '').strip()
        if len(clean_value) < 10:
            raise serializers.ValidationError('Message is too short.')
        if len(clean_value) > 2000:
            raise serializers.ValidationError('Message must be at most 2000 characters.')
        return clean_value


class SeriesAnnouncementRequestSerializer(serializers.ModelSerializer):
    series_title = serializers.CharField(source='series.title', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)

    class Meta:
        model = SeriesAnnouncementRequest
        fields = [
            'id',
            'series',
            'series_title',
            'created_by',
            'created_by_name',
            'approved_by',
            'approved_by_name',
            'related_post',
            'request_type',
            'title',
            'message',
            'status',
            'admin_note',
            'requested_at',
            'reviewed_at',
            'delivery_started_at',
            'delivery_completed_at',
            'audience_snapshot_count',
            'delivered_count',
            'failed_count',
            'idempotency_key',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields


class SeriesAnnouncementReviewSerializer(serializers.Serializer):
    admin_note = serializers.CharField(required=False, allow_blank=True, max_length=1000)


class MemberRecentSermonSerializer(serializers.ModelSerializer):
    speaker_name = serializers.SerializerMethodField()
    speaker_avatar = serializers.SerializerMethodField()
    series_id = serializers.UUIDField(source='series.id', read_only=True)
    series_title = serializers.CharField(source='series.title', read_only=True)

    class Meta:
        model = Post
        fields = [
            'id',
            'title',
            'speaker_name',
            'speaker_avatar',
            'series_id',
            'series_title',
            'featured_image',
            'published_at',
            'created_at',
            'content',
        ]
        read_only_fields = fields

    def get_speaker_name(self, obj):
        if not obj.author:
            return ''
        name = obj.author.get_full_name()
        return name.strip() if name and name.strip() else obj.author.email

    def get_speaker_avatar(self, obj):
        if not obj.author or not obj.author.profile_picture:
            return None
        request = self.context.get('request')
        url = obj.author.profile_picture.url
        if request:
            return request.build_absolute_uri(url)
        return url
