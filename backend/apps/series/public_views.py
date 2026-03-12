"""
Series Public Views
Public API endpoints for viewing series
"""
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Q

from apps.users.models import UserRole
from .models import Series, SeriesVisibility
from .serializers import SeriesSerializer, SeriesDetailSerializer


class PublicSeriesViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public viewset for viewing series (read-only)
    Respects visibility permissions
    """
    permission_classes = [AllowAny]
    queryset = Series.objects.filter(is_deleted=False)
    serializer_class = SeriesSerializer
    lookup_field = 'slug'
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return SeriesDetailSerializer
        return SeriesSerializer
    
    def get_queryset(self):
        """
        Filter series based on user authentication:
        - Anonymous: Only PUBLIC series
        - Member: PUBLIC + MEMBERS_ONLY series
        - Moderator/Admin: All series (including HIDDEN)
        """
        queryset = Series.objects.filter(is_deleted=False)
        user = self.request.user
        
        if not user.is_authenticated:
            # Visitors see only public series
            queryset = queryset.filter(visibility=SeriesVisibility.PUBLIC)
        elif user.role in [UserRole.ADMIN, UserRole.MODERATOR]:
            # Admins and moderators see all series
            pass
        else:
            # Members see public + members-only series
            queryset = queryset.filter(
                Q(visibility=SeriesVisibility.PUBLIC) | 
                Q(visibility=SeriesVisibility.MEMBERS_ONLY)
            )
        
        # Filter by visibility (if specified)
        visibility = self.request.query_params.get('visibility')
        if visibility:
            queryset = queryset.filter(visibility=visibility)
        
        # Filter featured series
        is_featured = self.request.query_params.get('is_featured')
        if is_featured is not None:
            queryset = queryset.filter(is_featured=is_featured.lower() == 'true')
        
        # Search by title
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(title__icontains=search)
        
        return queryset.order_by('-created_at')
    
    @action(detail=False, methods=['get'])
    def featured(self, request):
        """
        Get featured series for homepage
        GET /api/v1/public/series/featured/
        """
        queryset = self.get_queryset().filter(
            is_featured=True
        ).order_by('-featured_priority', '-created_at')
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
