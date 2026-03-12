"""
Public Content Views
Read-only endpoints for published content accessible to all users
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q

from .models import Post, PostStatus, PostContentType, WeeklyEvent
from .serializers import PostSerializer, PostListSerializer, DailyWordSerializer, WeeklyEventSerializer


class PublicPostViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public read-only viewset for published posts
    Accessible to all users (no authentication required)
    """
    permission_classes = [AllowAny]
    lookup_field = 'id'  # Can use slug if you add slug field later
    
    def get_serializer_class(self):
        if self.action == 'list':
            return PostListSerializer
        return PostSerializer
    
    def get_queryset(self):
        """
        Return only PUBLISHED posts (status=PUBLISHED)
        with publish time in the past
        Ensures scheduled and draft posts never leak to public
        """
        queryset = Post.objects.filter(
            status=PostStatus.PUBLISHED,
            is_deleted=False,
            published_at__lte=timezone.now()
        )
        
        # Filter by content type (support both slug and old post_type format)
        type_param = self.request.query_params.get('type')
        if type_param:
            # Try to find by content_type slug first (new way)
            from .models import PostContentType
            try:
                content_type = PostContentType.objects.get(slug=type_param.lower())
                queryset = queryset.filter(content_type=content_type)
            except PostContentType.DoesNotExist:
                # Fallback to old post_type field
                queryset = queryset.filter(post_type=type_param.upper())
        
        # Filter by category
        category_param = self.request.query_params.get('category')
        if category_param and category_param.lower() != 'all':
            queryset = queryset.filter(category__iexact=category_param)
        
        return queryset.order_by('-published_at')
    
    def retrieve(self, request, *args, **kwargs):
        """Get single post by ID"""
        instance = self.get_object()
        
        # Increment views count
        instance.views_count += 1
        instance.save(update_fields=['views_count'])
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_content_types(request):
    """
    Public endpoint to get all enabled content types with published post counts.
    Returns all enabled content types (both system and custom) regardless of post count.
    This powers the dynamic filter on the public content library.
    When a custom type is created, deleted, or modified, changes automatically reflect here.
    """
    # Get all enabled content types (both system and custom)
    content_types = PostContentType.objects.filter(is_enabled=True)
    
    # Get published post counts for each content type
    # Only count posts that are published and not deleted, with publish time in past
    result = []
    for ct in content_types:
        count = Post.objects.filter(
            content_type=ct,
            status=PostStatus.PUBLISHED,
            is_deleted=False,
            published_at__lte=timezone.now()
        ).count()
        
        # Include all enabled content types (system and custom)
        # This ensures custom types appear immediately after creation
        result.append({
            'id': str(ct.id),
            'slug': ct.slug,
            'name': ct.name,
            'count': count,
            'is_system': ct.is_system,
            'sort_order': ct.sort_order
        })
    
    # Sort by sort_order, then by name
    result.sort(key=lambda x: (x['sort_order'], x['name']))
    
    return Response({
        'results': result,
        'count': len(result)
    })


# ============================================================================
# PUBLIC DAILY WORD ENDPOINTS
# ============================================================================

class PublicDailyWordViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public API for daily word / devotional content
    - GET /api/v1/public/daily-words/ - List published daily words
    - GET /api/v1/public/daily-words/today/ - Get today's word
    - GET /api/v1/public/daily-words/calendar/ - Get month calendar
    Routes by scheduled_date as well
    """
    permission_classes = [AllowAny]  # Public access
    serializer_class = DailyWordSerializer
    
    def get_queryset(self):
        """
        Only return published devotional posts that are not in the future
        Published means ready for delivery, but only on/after scheduled_date
        """
        today = timezone.now().date()
        return Post.objects.filter(
            content_type__slug='devotional',
            status='PUBLISHED',
            is_deleted=False,
            scheduled_date__lte=today  # Only show today and past devotionals
        ).order_by('-scheduled_date')
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get today's daily word"""
        today = timezone.now().date()
        
        post = self.get_queryset().filter(scheduled_date=today).first()
        
        if not post:
            return Response({
                'message': 'No daily word for today'
            }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = self.get_serializer(post)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def calendar(self, request):
        """
        Get calendar view of daily words for a month
        Only shows posts on or after their scheduled date
        """
        from datetime import date as date_class
        from calendar import monthcalendar
        
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        
        if not month or not year:
            today = timezone.now().date()
            month = today.month
            year = today.year
        
        try:
            month = int(month)
            year = int(year)
        except (ValueError, TypeError):
            return Response({
                'error': 'month and year must be integers'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Build calendar
        cal = monthcalendar(year, month)
        
        response_data = {
            'year': year,
            'month': month,
            'days': []
        }
        
        # Get current date to filter out future posts
        today = timezone.now().date()
        
        # Get all posts for this month that are not in the future
        posts_dict = {}
        for post in self.get_queryset().filter(
            scheduled_date__year=year,
            scheduled_date__month=month,
            scheduled_date__lte=today  # Only include today and past dates
        ):
            posts_dict[post.scheduled_date] = post
        
        # Build day array
        for week in cal:
            for day in week:
                if day == 0:
                    continue
                
                check_date = date_class(year, month, day)
                post = posts_dict.get(check_date)
                
                response_data['days'].append({
                    'date': str(check_date),
                    'day': day,
                    'has_post': post is not None,
                    'title': post.title if post else None,
                    'featured_image': post.featured_image if post else None,
                })
        
        return Response(response_data)
    
    @action(detail=False, methods=['get'], url_path='by-date/(?P<date>[^/.]+)')
    def by_date(self, request, date=None):
        """
        Get daily word for specific date (YYYY-MM-DD)
        Only returns published posts on or after their scheduled date
        """
        try:
            from datetime import datetime
            lookup_date = datetime.strptime(date, '%Y-%m-%d').date()
        except (ValueError, TypeError):
            return Response({
                'error': 'Invalid date format. Use YYYY-MM-DD'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Prevent access to future daily words
        # Published means "ready for delivery", not "deliver before scheduled date"
        today = timezone.now().date()
        if lookup_date > today:
            return Response({
                'message': f'No daily word found for {date}'
            }, status=status.HTTP_404_NOT_FOUND)
        
        post = self.get_queryset().filter(scheduled_date=lookup_date).first()
        
        if not post:
            return Response({
                'message': f'No daily word found for {date}'
            }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = self.get_serializer(post)
        return Response(serializer.data)


# ============================================================================
# PUBLIC WEEKLY EVENTS
# ============================================================================

class PublicWeeklyEventViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public API for weekly flow events
    - GET /api/v1/public/weekly-events/ - List all weekly events
    """
    permission_classes = [AllowAny]  # Public access
    serializer_class = WeeklyEventSerializer
    
    def get_queryset(self):
        return WeeklyEvent.objects.all().order_by('day_of_week', 'sort_order')

