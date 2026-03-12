"""
Draft Management Views
API endpoints for auto-save draft functionality
Prevents data loss from browser crashes, network issues, or accidental navigation
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.shortcuts import get_object_or_404
from datetime import timedelta
from django.db.models import Q

from apps.users.permissions import IsModerator, IsAdmin
from .models import Draft, Post
from .serializers import (
    DraftSerializer, DraftCreateSerializer, DraftUpdateSerializer, DraftListSerializer
)


class DraftViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing auto-save drafts
    
    Features:
    - Create/update drafts for new posts or editing existing posts
    - List user's drafts
    - Retrieve specific draft
    - Delete drafts
    - Check for existing drafts
    - Bulk sync multiple drafts
    - Auto-cleanup old drafts
    """
    permission_classes = [IsAuthenticated, IsModerator]
    
    def get_queryset(self):
        """Users can only access their own drafts"""
        return Draft.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return DraftCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return DraftUpdateSerializer
        elif self.action == 'list':
            return DraftListSerializer
        return DraftSerializer
    
    def perform_create(self, serializer):
        """Create draft with current user"""
        # Check if draft already exists for this post (if editing existing)
        post = serializer.validated_data.get('post')
        if post:
            # Check for existing draft for this user+post combination
            existing = Draft.objects.filter(user=self.request.user, post=post).first()
            if existing:
                # Update existing draft instead of creating new
                update_serializer = DraftUpdateSerializer(
                    existing, 
                    # Use the raw payload (pk strings) instead of validated_data
                    # because validated_data already contains model instances
                    # which DraftUpdateSerializer expects as primary-key values.
                    data=serializer.initial_data, 
                    partial=True
                )
                update_serializer.is_valid(raise_exception=True)
                return update_serializer.save()
        
        serializer.save(user=self.request.user)
    
    def create(self, request, *args, **kwargs):
        """
        Create or update draft
        Returns 200 if updated existing, 201 if created new
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Check if this would be an update
        post = serializer.validated_data.get('post')
        existing = None
        if post:
            existing = Draft.objects.filter(user=request.user, post=post).first()
        
        instance = self.perform_create(serializer)
        
        # If perform_create returned an instance, it was updated
        if isinstance(instance, Draft):
            output_serializer = DraftSerializer(instance)
            return Response(output_serializer.data, status=status.HTTP_200_OK)
        
        # Otherwise, it was created
        headers = self.get_success_headers(serializer.data)
        output_serializer = DraftSerializer(serializer.instance)
        return Response(
            output_serializer.data, 
            status=status.HTTP_201_CREATED, 
            headers=headers
        )
    
    def update(self, request, *args, **kwargs):
        """Update existing draft with version increment"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Return full draft data
        output_serializer = DraftSerializer(serializer.instance)
        return Response(output_serializer.data)
    
    @action(detail=False, methods=['get'], url_path='check/(?P<post_id>[^/.]+)')
    def check_draft(self, request, post_id=None):
        """
        Check if a draft exists for a specific post
        GET /api/v1/admin/drafts/check/{post_id}/
        
        Returns:
        - Draft data if exists
        - 404 if no draft found
        """
        if post_id == 'new':
            # Check for any recent draft without a post (new post being created)
            recent_draft = Draft.objects.filter(
                user=request.user,
                post__isnull=True
            ).order_by('-last_autosave_at').first()
            
            if recent_draft:
                serializer = DraftSerializer(recent_draft)
                return Response(serializer.data)
            return Response(
                {'detail': 'No draft found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check for draft linked to specific post
        draft = Draft.objects.filter(user=request.user, post_id=post_id).first()
        if draft:
            serializer = DraftSerializer(draft)
            return Response(serializer.data)
        
        return Response(
            {'detail': 'No draft found for this post'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    @action(detail=False, methods=['post'])
    def sync(self, request):
        """
        Bulk sync multiple drafts from local storage
        POST /api/v1/admin/drafts/sync/
        
        Body: {
            "drafts": [
                {"draft_data": {...}, "content_type": "uuid", "post": "uuid or null"},
                ...
            ]
        }
        
        Returns:
        - List of synced draft IDs
        - Any errors encountered
        """
        drafts_data = request.data.get('drafts', [])
        if not isinstance(drafts_data, list):
            return Response(
                {'error': 'drafts must be an array'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        synced = []
        errors = []
        
        for idx, draft_data in enumerate(drafts_data):
            try:
                serializer = DraftCreateSerializer(data=draft_data)
                serializer.is_valid(raise_exception=True)
                
                # Check if draft already exists
                post = serializer.validated_data.get('post')
                if post:
                    existing = Draft.objects.filter(user=request.user, post=post).first()
                    if existing:
                        # Update existing
                        update_serializer = DraftUpdateSerializer(
                            existing, 
                            data=draft_data, 
                            partial=True
                        )
                        update_serializer.is_valid(raise_exception=True)
                        update_serializer.save()
                        synced.append(str(existing.id))
                        continue
                
                # Create new draft
                draft = serializer.save(user=request.user)
                synced.append(str(draft.id))
                
            except Exception as e:
                errors.append({
                    'index': idx,
                    'error': str(e)
                })
        
        return Response({
            'synced': synced,
            'synced_count': len(synced),
            'errors': errors,
            'error_count': len(errors)
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """
        Convert draft to published post
        POST /api/v1/admin/drafts/{id}/publish/
        
        Creates or updates the post and deletes the draft
        """
        draft = self.get_object()
        
        try:
            # If draft is linked to existing post, update it
            if draft.post:
                from .serializers import PostUpdateSerializer
                post = draft.post
                post_serializer = PostUpdateSerializer(
                    post, 
                    data=draft.draft_data, 
                    partial=True
                )
                post_serializer.is_valid(raise_exception=True)
                post_serializer.save()
                
                # Publish if requested
                if draft.draft_data.get('status') == 'PUBLISHED':
                    post.publish()
                
                # Delete draft
                draft.delete()
                
                # Return updated post
                from .serializers import PostSerializer
                output_serializer = PostSerializer(post)
                return Response(output_serializer.data, status=status.HTTP_200_OK)
            
            else:
                # Create new post from draft
                from .serializers import PostCreateSerializer
                post_serializer = PostCreateSerializer(data=draft.draft_data)
                post_serializer.is_valid(raise_exception=True)
                post = post_serializer.save(author=request.user)
                
                # Delete draft
                draft.delete()
                
                # Return new post
                from .serializers import PostSerializer
                output_serializer = PostSerializer(post)
                return Response(output_serializer.data, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            return Response(
                {'error': f'Failed to publish: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def cleanup_old(self, request):
        """
        Delete drafts older than specified days (default 30)
        POST /api/v1/admin/drafts/cleanup_old/
        
        Body: {"days": 30}
        Admin only
        """
        # Check if user is admin
        from apps.users.models import UserRole
        from rest_framework.exceptions import PermissionDenied
        
        if request.user.role != UserRole.ADMIN:
            raise PermissionDenied("Only admins can run cleanup")
        
        days = request.data.get('days', 30)
        cutoff_date = timezone.now() - timedelta(days=days)
        
        old_drafts = Draft.objects.filter(last_autosave_at__lt=cutoff_date)
        count = old_drafts.count()
        old_drafts.delete()
        
        return Response({
            'deleted_count': count,
            'message': f'Deleted {count} draft(s) older than {days} days'
        }, status=status.HTTP_200_OK)
