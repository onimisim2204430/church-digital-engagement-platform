"""
Series Views
Admin API endpoints for managing series
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from django.db import transaction

from apps.users.permissions import IsModerator, IsAdmin, HasModulePermission
from apps.users.models import UserRole
from apps.moderation.models import AuditLog, ActionType
from apps.content.models import Post
from .models import Series, SeriesVisibility, CurrentSeriesSpotlight
from .serializers import (
    SeriesSerializer, SeriesCreateSerializer, SeriesUpdateSerializer,
    SeriesDetailSerializer, AddPostToSeriesSerializer,
    RemovePostFromSeriesSerializer, ReorderSeriesPostsSerializer,
    SetFeaturedSeriesSerializer, CurrentSeriesSpotlightSerializer
)


def create_audit_log(user, action_type, description, content_object=None, request=None):
    """Helper function to create audit logs"""
    log_data = {
        'user': user,
        'action_type': action_type,
        'description': description,
    }
    
    if content_object:
        log_data['content_type'] = ContentType.objects.get_for_model(content_object)
        log_data['object_id'] = str(content_object.id)
    
    if request:
        log_data['ip_address'] = request.META.get('REMOTE_ADDR')
        log_data['user_agent'] = request.META.get('HTTP_USER_AGENT', '')[:500]
    
    AuditLog.objects.create(**log_data)


class AdminSeriesViewSet(viewsets.ModelViewSet):
    """
    Admin viewset for managing series (CRUD operations)
    Accessible by ADMIN and MODERATORs with content.series permission

    Permissions:
    - ADMIN: Full access to all series
    - MODERATOR: Can create series, manage only their own (requires content.series)
    """
    permission_classes = [IsAuthenticated, IsModerator]

    def get_permissions(self):
        return [IsAuthenticated(), HasModulePermission('content.series')]
    queryset = Series.objects.filter(is_deleted=False)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return SeriesCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return SeriesUpdateSerializer
        elif self.action == 'retrieve':
            return SeriesDetailSerializer
        return SeriesSerializer
    
    def check_series_ownership(self, series):
        """
        Check if the current user can modify the series.
        Admins can modify any series, moderators can only modify their own.
        Returns True if allowed, raises PermissionDenied if not.
        """
        from rest_framework.exceptions import PermissionDenied
        
        if self.request.user.role == UserRole.MODERATOR and series.author != self.request.user:
            raise PermissionDenied("You do not have permission to modify this series")
        return True
    
    def get_queryset(self):
        """
        Filter series based on user role:
        - ADMIN: See all series
        - MODERATOR: See only their own series
        """
        queryset = Series.objects.filter(is_deleted=False)
        
        # Role-based filtering
        if self.request.user.role == UserRole.MODERATOR:
            queryset = queryset.filter(author=self.request.user)
        
        # Filter by visibility
        visibility = self.request.query_params.get('visibility')
        if visibility:
            queryset = queryset.filter(visibility=visibility)
        
        # Filter by featured status
        is_featured = self.request.query_params.get('is_featured')
        if is_featured is not None:
            queryset = queryset.filter(is_featured=is_featured.lower() == 'true')
        
        # Search by title
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(title__icontains=search)
        
        return queryset.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        """Override create to return full serialized response with all fields"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Get the created instance
        instance = serializer.instance
        
        # Serialize response using full SeriesSerializer
        output_serializer = SeriesSerializer(instance)
        headers = self.get_success_headers(serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def perform_create(self, serializer):
        series = serializer.save(author=self.request.user)
        
        # Create audit log
        create_audit_log(
            user=self.request.user,
            action_type=ActionType.CREATE,
            description=f"Created series: {series.title}",
            content_object=series,
            request=self.request
        )
    
    def update(self, request, *args, **kwargs):
        """Override update to return full serialized response with all fields"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Serialize response using full SeriesSerializer
        output_serializer = SeriesSerializer(instance)
        return Response(output_serializer.data)
    
    def perform_update(self, serializer):
        series = serializer.instance
        
        # Check ownership
        self.check_series_ownership(series)
        
        series = serializer.save()
        
        # Create audit log
        create_audit_log(
            user=self.request.user,
            action_type=ActionType.UPDATE,
            description=f"Updated series: {series.title}",
            content_object=series,
            request=self.request
        )
    
    def perform_destroy(self, instance):
        # Check ownership
        self.check_series_ownership(instance)
        
        # Soft delete
        instance.soft_delete(self.request.user)
        
        # Create audit log
        create_audit_log(
            user=self.request.user,
            action_type=ActionType.DELETE,
            description=f"Deleted series: {instance.title}",
            content_object=instance,
            request=self.request
        )

    @action(detail=False, methods=['post'], url_path='set-featured')
    def set_featured(self, request):
        """
        Atomically set exactly 3 featured series for homepage archive.
        POST /api/v1/admin/series/set-featured/
        Body: {"series_ids": ["uuid-1", "uuid-2", "uuid-3"]}
        """
        serializer = SetFeaturedSeriesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        selected_ids = serializer.validated_data['series_ids']

        allowed_queryset = self.get_queryset()
        selected_series = list(allowed_queryset.filter(pk__in=selected_ids))

        if len(selected_series) != 3:
            return Response(
                {'series_ids': ['One or more selected series were not found or are not accessible.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        missing_ids = [str(series_id) for series_id in selected_ids if str(series_id) not in {str(s.pk) for s in selected_series}]
        if missing_ids:
            return Response(
                {'series_ids': [f"Invalid or inaccessible series IDs: {', '.join(missing_ids)}"]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order_map = {str(series_id): index for index, series_id in enumerate(selected_ids)}

        with transaction.atomic():
            # Clear existing featured flags in the requester's queryset scope.
            allowed_queryset.exclude(pk__in=selected_ids).filter(is_featured=True).update(
                is_featured=False,
                featured_priority=0,
            )

            # Set selected items as featured and assign descending priority by selected order.
            for series in selected_series:
                selected_index = order_map[str(series.pk)]
                series.is_featured = True
                series.featured_priority = 3 - selected_index
                series.save(update_fields=['is_featured', 'featured_priority', 'updated_at'])

        ordered_featured = list(
            allowed_queryset.filter(pk__in=selected_ids, is_featured=True)
        )
        ordered_featured.sort(key=lambda s: order_map[str(s.pk)])

        create_audit_log(
            user=request.user,
            action_type=ActionType.UPDATE,
            description='Updated featured series selection for homepage archive',
            request=request,
        )

        output = SeriesSerializer(ordered_featured, many=True, context={'request': request})
        return Response({'results': output.data}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get', 'post'], url_path='current-spotlight')
    def current_spotlight(self, request):
        """
        Get or update the singleton Current Series spotlight config.
        GET/POST /api/v1/admin/series/current-spotlight/
        """
        spotlight, _created = CurrentSeriesSpotlight.objects.get_or_create(singleton_key='default')

        if request.method == 'GET':
            serializer = CurrentSeriesSpotlightSerializer(spotlight, context={'request': request})
            return Response(serializer.data)

        serializer = CurrentSeriesSpotlightSerializer(
            spotlight,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        updated = serializer.save(updated_by=request.user)

        create_audit_log(
            user=request.user,
            action_type=ActionType.UPDATE,
            description='Updated Current Series spotlight settings',
            request=request,
        )

        return Response(CurrentSeriesSpotlightSerializer(updated, context={'request': request}).data)
    
    @action(detail=True, methods=['post'])
    def add_post(self, request, pk=None):
        """
        Add a post to this series
        POST /api/v1/admin/series/{id}/add_post/
        Body: {"post_id": "uuid", "series_order": 1}
        """
        series = self.get_object()
        self.check_series_ownership(series)
        
        serializer = AddPostToSeriesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        post_id = serializer.validated_data['post_id']
        series_order = serializer.validated_data.get('series_order')
        
        try:
            post = Post.objects.get(id=post_id, is_deleted=False)
        except Post.DoesNotExist:
            return Response(
                {'error': 'Post not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Set series order (auto-suggest if not provided)
        if series_order is None:
            series_order = series.get_next_part_number()
        
        post.series = series
        post.series_order = series_order
        post.save(update_fields=['series', 'series_order'])
        
        # Create audit log
        create_audit_log(
            user=request.user,
            action_type=ActionType.UPDATE,
            description=f"Added post '{post.title}' to series '{series.title}'",
            content_object=series,
            request=request
        )
        
        return Response({
            'message': 'Post added to series successfully',
            'series_order': series_order
        })
    
    @action(detail=True, methods=['post'])
    def remove_post(self, request, pk=None):
        """
        Remove a post from this series
        POST /api/v1/admin/series/{id}/remove_post/
        Body: {"post_id": "uuid"}
        """
        series = self.get_object()
        self.check_series_ownership(series)
        
        serializer = RemovePostFromSeriesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        post_id = serializer.validated_data['post_id']
        
        try:
            post = Post.objects.get(id=post_id, series=series)
        except Post.DoesNotExist:
            return Response(
                {'error': 'Post not found in this series'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        post.series = None
        post.series_order = 0
        post.save(update_fields=['series', 'series_order'])
        
        # Create audit log
        create_audit_log(
            user=request.user,
            action_type=ActionType.UPDATE,
            description=f"Removed post '{post.title}' from series '{series.title}'",
            content_object=series,
            request=request
        )
        
        return Response({'message': 'Post removed from series successfully'})
    
    @action(detail=True, methods=['post'])
    def reorder(self, request, pk=None):
        """
        Reorder posts in this series
        POST /api/v1/admin/series/{id}/reorder/
        Body: {"post_orders": [{"post_id": "uuid", "order": 1}, ...]}
        """
        series = self.get_object()
        self.check_series_ownership(series)
        
        serializer = ReorderSeriesPostsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        post_orders = serializer.validated_data['post_orders']
        
        with transaction.atomic():
            for item in post_orders:
                try:
                    post = Post.objects.get(id=item['post_id'], series=series)
                    post.series_order = int(item['order'])
                    post.save(update_fields=['series_order'])
                except Post.DoesNotExist:
                    return Response(
                        {'error': f"Post {item['post_id']} not found in this series"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
        
        # Create audit log
        create_audit_log(
            user=request.user,
            action_type=ActionType.UPDATE,
            description=f"Reordered posts in series '{series.title}'",
            content_object=series,
            request=request
        )
        
        return Response({'message': 'Posts reordered successfully'})
    
    @action(detail=True, methods=['get'])
    def posts(self, request, pk=None):
        """
        Get all posts in this series
        GET /api/v1/admin/series/{id}/posts/
        """
        series = self.get_object()
        posts = series.posts.filter(is_deleted=False).order_by('series_order', 'created_at')
        
        from apps.content.serializers import PostListSerializer
        serializer = PostListSerializer(posts, many=True)
        
        return Response(serializer.data)
