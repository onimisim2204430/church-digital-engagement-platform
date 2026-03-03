"""
Content Admin Views
Admin-only API endpoints for content management
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError as DjangoValidationError

from apps.users.permissions import IsModerator, IsAdmin
from apps.moderation.models import AuditLog, ActionType
from .models import Post, PostContentType
from .serializers import (
    PostSerializer, PostCreateSerializer, PostUpdateSerializer,
    PostListSerializer, PostPublishSerializer, PostContentTypeSerializer,
    PostContentTypeCreateSerializer, PostContentTypeUpdateSerializer
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


class AdminPostViewSet(viewsets.ModelViewSet):
    """
    Admin viewset for managing posts (CRUD operations)
    Accessible by ADMIN and MODERATOR
    """
    permission_classes = [IsAuthenticated, IsModerator]
    queryset = Post.objects.filter(is_deleted=False)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PostCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return PostUpdateSerializer
        elif self.action == 'list':
            return PostListSerializer
        return PostSerializer
    
    def check_post_ownership(self, post):
        """
        Check if the current user can modify the post.
        Admins can modify any post, moderators can only modify their own.
        Returns True if allowed, raises PermissionDenied if not.
        """
        from apps.users.models import UserRole
        from rest_framework.exceptions import PermissionDenied
        
        if self.request.user.role == UserRole.MODERATOR and post.author != self.request.user:
            raise PermissionDenied("You do not have permission to modify this post")
        return True
    
    def update(self, request, *args, **kwargs):
        """
        Override update to:
        1. Add role-based ownership check (moderators can only update their own)
        2. Return full serialized response with all fields (including series_title, etc.)
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Check ownership for moderators
        self.check_post_ownership(instance)
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        
        if not serializer.is_valid():
            print(f"DEBUG - Validation errors: {serializer.errors}")
            print(f"DEBUG - Request data: {request.data}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        self.perform_update(serializer)
        
        # Return full serialized response using PostSerializer
        output_serializer = PostSerializer(instance)
        return Response(output_serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """
        Override destroy to add role-based ownership check
        Moderators can only delete their own posts
        """
        instance = self.get_object()
        
        # Check ownership for moderators
        self.check_post_ownership(instance)
        
        return super().destroy(request, *args, **kwargs)
    
    def get_queryset(self):
        """
        Filter posts based on user role:
        - ADMIN: See all posts
        - MODERATOR: See only their own posts
        """
        queryset = Post.objects.all()

        # Filter by deleted status (default: exclude deleted)
        is_deleted = self.request.query_params.get('is_deleted')
        if is_deleted is None:
            queryset = queryset.filter(is_deleted=False)
        else:
            queryset = queryset.filter(is_deleted=is_deleted.lower() == 'true')
        
        # Role-based filtering
        from apps.users.models import UserRole
        if self.request.user.role == UserRole.MODERATOR:
            # Moderators can only see their own posts
            queryset = queryset.filter(author=self.request.user)
        # Admins see all posts (no additional filter)
        
        # Filter by post type
        post_type = self.request.query_params.get('post_type')
        if post_type:
            queryset = queryset.filter(post_type=post_type)
        
        # Filter by status (DRAFT, PUBLISHED)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Legacy filter by published status (for backward compatibility)
        is_published = self.request.query_params.get('is_published')
        if is_published is not None:
            queryset = queryset.filter(is_published=is_published.lower() == 'true')
        
        # Search by title
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(title__icontains=search)
        
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        post = serializer.save(author=self.request.user)
        
        # Create audit log
        create_audit_log(
            user=self.request.user,
            action_type=ActionType.CREATE,
            description=f"Created post: {post.title}",
            content_object=post,
            request=self.request
        )
        return post
    
    def create(self, request, *args, **kwargs):
        """Override create to return full post data"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        post = self.perform_create(serializer)
        
        # Return full post data using PostSerializer
        response_serializer = PostSerializer(post)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    def perform_update(self, serializer):
        post = serializer.save()
        
        # Create audit log
        create_audit_log(
            user=self.request.user,
            action_type=ActionType.UPDATE,
            description=f"Updated post: {post.title}",
            content_object=post,
            request=self.request
        )
    
    def perform_destroy(self, instance):
        # Soft delete
        instance.soft_delete(self.request.user)
        
        # Create audit log
        create_audit_log(
            user=self.request.user,
            action_type=ActionType.DELETE,
            description=f"Deleted post: {instance.title}",
            content_object=instance,
            request=self.request
        )
    
    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """Publish a post immediately"""
        post = self.get_object()
        
        # Check ownership for moderators
        self.check_post_ownership(post)
        
        if post.status == 'PUBLISHED':
            return Response({
                'message': 'Post is already published'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        post.publish()
        
        # Create audit log
        description = f"Published post: {post.title}"
        
        create_audit_log(
            user=request.user,
            action_type=ActionType.PUBLISH,
            description=description,
            content_object=post,
            request=request
        )
        
        return Response({
            'message': 'Post published successfully',
            'post': PostSerializer(post).data
        })
    
    @action(detail=True, methods=['post'])
    def unpublish(self, request, pk=None):
        """Unpublish a post"""
        post = self.get_object()
        
        # Check ownership for moderators
        self.check_post_ownership(post)
        
        if not post.is_published:
            return Response({
                'message': 'Post is not published'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        post.unpublish()
        
        # Create audit log
        create_audit_log(
            user=request.user,
            action_type=ActionType.UNPUBLISH,
            description=f"Unpublished post: {post.title}",
            content_object=post,
            request=request
        )
        
        return Response({
            'message': 'Post unpublished successfully',
            'post': PostSerializer(post).data
        })
    
    @action(detail=True, methods=['patch'])
    def toggle_comments(self, request, pk=None):
        """Enable or disable comments on a post"""
        post = self.get_object()
        
        # Check ownership for moderators
        self.check_post_ownership(post)
        
        post.comments_enabled = not post.comments_enabled
        post.save()
        
        create_audit_log(
            user=request.user,
            action_type=ActionType.UPDATE,
            description=f"{'Enabled' if post.comments_enabled else 'Disabled'} comments on: {post.title}",
            content_object=post,
            request=request
        )
        
        return Response({
            'message': f"Comments {'enabled' if post.comments_enabled else 'disabled'}",
            'comments_enabled': post.comments_enabled
        })
    
    @action(detail=True, methods=['patch'])
    def toggle_reactions(self, request, pk=None):
        """Enable or disable reactions on a post"""
        post = self.get_object()
        
        # Check ownership for moderators
        self.check_post_ownership(post)
        
        post.reactions_enabled = not post.reactions_enabled
        post.save()
        
        create_audit_log(
            user=request.user,
            action_type=ActionType.UPDATE,
            description=f"{'Enabled' if post.reactions_enabled else 'Disabled'} reactions on: {post.title}",
            content_object=post,
            request=request
        )
        
        return Response({
            'message': f"Reactions {'enabled' if post.reactions_enabled else 'disabled'}",
            'reactions_enabled': post.reactions_enabled
        })
    
    @action(detail=True, methods=['post'], url_path='schedule')
    def schedule_post(self, request, pk=None):
        """Schedule a post for future publication"""
        post = self.get_object()
        
        # Check ownership for moderators
        self.check_post_ownership(post)
        
        # Update the publish date from request data
        publish_date = request.data.get('publish_at')
        if not publish_date:
            return Response({
                'error': 'publish_at field is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            post.scheduled_date = publish_date
            post.status = 'SCHEDULED'
            post.full_clean()
            post.save()
            
            create_audit_log(
                user=request.user,
                action_type=ActionType.UPDATE,
                description=f"Scheduled post: {post.title} for {publish_date}",
                content_object=post,
                request=request
            )
            
            return Response({
                'message': 'Post scheduled successfully',
                'post': PostSerializer(post).data
            })
        except DjangoValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ============================================================================
# DAILY WORD VIEWSET (Admin)
# ============================================================================

class AdminDailyWordViewSet(viewsets.ModelViewSet):
    """
    Admin viewset for managing daily word / devotional posts
    Features:
    - One post per scheduled_date
    - Conflict detection with resolution dialog
    - Full CRUD for devotional content
    """
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        """Filter to only devotional posts"""
        return Post.objects.filter(
            content_type__slug='devotional',
            is_deleted=False
        ).order_by('-scheduled_date', '-created_at')
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            from .serializers import DailyWordCreateUpdateSerializer
            return DailyWordCreateUpdateSerializer
        from .serializers import DailyWordSerializer
        return DailyWordSerializer
    
    def create(self, request, *args, **kwargs):
        """
        Create a new daily word with conflict detection
        Returns 409 with existing post info if date already has content
        """
        serializer = self.get_serializer(data=request.data)
        
        # First validate the data
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Check for conflict before creating
        scheduled_date = serializer.validated_data.get('scheduled_date')
        if scheduled_date:
            existing = Post.objects.filter(
                scheduled_date=scheduled_date,
                content_type__slug='devotional',
                is_deleted=False
            ).first()
            
            if existing:
                from .serializers import DailyWordSerializer, DailyWordConflictSerializer
                conflict_response = {
                    'has_conflict': True,
                    'existing_post': DailyWordSerializer(existing).data,
                    'message': f'A devotional post already exists for {scheduled_date}: "{existing.title}" by {existing.author.get_full_name() or existing.author.username}'
                }
                return Response(conflict_response, status=status.HTTP_409_CONFLICT)
        
        # No conflict, proceed with creation
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def perform_create(self, serializer):
        """Save the post with the current user as author"""
        serializer.save(author=self.request.user)
    
    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """Publish a daily word immediately"""
        post = self.get_object()
        
        if post.status == 'PUBLISHED':
            return Response({
                'message': 'Post is already published'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        post.publish()
        
        create_audit_log(
            user=request.user,
            action_type=ActionType.PUBLISH,
            description=f"Published daily word: {post.title}",
            content_object=post,
            request=request
        )
        
        from .serializers import DailyWordSerializer
        return Response({
            'message': 'Daily word published successfully',
            'post': DailyWordSerializer(post).data
        })
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get today's daily word"""
        from django.utils import timezone
        today = timezone.now().date()
        
        post = Post.objects.filter(
            scheduled_date=today,
            content_type__slug='devotional',
            status='PUBLISHED',
            is_deleted=False
        ).first()
        
        if not post:
            return Response({
                'message': 'No daily word for today'
            }, status=status.HTTP_404_NOT_FOUND)
        
        from .serializers import DailyWordSerializer
        return Response(DailyWordSerializer(post).data)
    
    @action(detail=False, methods=['get'])
    def calendar(self, request):
        """Get month calendar with daily word statuses"""
        from django.utils import timezone
        from datetime import date, timedelta
        
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        
        if not month or not year:
            today = timezone.now().date()
            month = today.month
            year = today.year
        
        month = int(month)
        year = int(year)
        
        # Get all posts for the month
        from calendar import monthcalendar
        cal = monthcalendar(year, month)
        
        response_data = {
            'year': year,
            'month': month,
            'days': []
        }
        
        for week in cal:
            for day in week:
                if day == 0:
                    continue
                
                check_date = date(year, month, day)
                post = Post.objects.filter(
                    scheduled_date=check_date,
                    content_type__slug='devotional',
                    is_deleted=False
                ).first()
                
                response_data['days'].append({
                    'date': str(check_date),
                    'day': day,
                    'has_post': post is not None,
                    'status': post.status if post else None,
                    'title': post.title if post else None,
                })
        
        return Response(response_data)


# ============================================================================
# WEEKLY EVENT VIEWSET (Admin & Public)
# ============================================================================

class AdminWeeklyEventViewSet(viewsets.ModelViewSet):
    """
    Admin viewset for managing weekly flow events
    """
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        from .models import WeeklyEvent
        return WeeklyEvent.objects.all().order_by('day_of_week', 'sort_order')
    
    def get_serializer_class(self):
        from .serializers import WeeklyEventSerializer, WeeklyEventCreateUpdateSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return WeeklyEventCreateUpdateSerializer
        return WeeklyEventSerializer


class PublicWeeklyEventViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public viewset for viewing weekly events
    Unauthenticated access
    """
    permission_classes = []  # Public access
    
    def get_queryset(self):
        from .models import WeeklyEvent
        return WeeklyEvent.objects.all().order_by('day_of_week', 'sort_order')
    
    def get_serializer_class(self):
        from .serializers import WeeklyEventSerializer
        return WeeklyEventSerializer
