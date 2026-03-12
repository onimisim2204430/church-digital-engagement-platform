"""
Series Serializers
"""
from rest_framework import serializers
from django.utils import timezone
from .models import Series, SeriesVisibility
from apps.content.models import Post


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
    
    class Meta:
        model = Series
        fields = [
            'id', 'title', 'slug', 'description', 'cover_image',
            'author', 'author_name', 'author_email',
            'visibility', 'is_featured', 'featured_priority',
            'total_views', 'post_count', 'published_post_count',
            'date_range', 'next_part_number', 'posts',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'slug', 'total_views', 'created_at', 'updated_at']
    
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
