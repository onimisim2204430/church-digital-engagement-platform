"""
Content Type Admin Views
Admin-only API endpoints for managing content types
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.contenttypes.models import ContentType

from apps.users.permissions import IsAdmin, IsModerator
from apps.moderation.models import AuditLog, ActionType
from .models import PostContentType
from .serializers import (
    PostContentTypeSerializer,
    PostContentTypeCreateSerializer,
    PostContentTypeUpdateSerializer
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


class ContentTypeViewSet(viewsets.ModelViewSet):
    """
    Content type management viewset with granular permissions:
    
    - READ operations (list, retrieve, enabled): Accessible by ADMIN and MODERATOR
    - WRITE operations (create, update, delete): Accessible by ADMIN ONLY
    
    This allows moderators to see content types when creating/editing posts,
    while keeping type management admin-only.
    """
    permission_classes = [IsAuthenticated, IsModerator]  # Base permission
    queryset = PostContentType.objects.all()
    
    def get_permissions(self):
        """
        Override permissions based on action:
        - Safe methods (GET): Allow moderators
        - Unsafe methods (POST, PUT, PATCH, DELETE): Require admin
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'toggle_enabled']:
            # Write operations require admin
            return [IsAuthenticated(), IsAdmin()]
        # Read operations allow moderators
        return [IsAuthenticated(), IsModerator()]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PostContentTypeCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return PostContentTypeUpdateSerializer
        return PostContentTypeSerializer
    
    def list(self, request, *args, **kwargs):
        """List all content types"""
        queryset = self.get_queryset().order_by('sort_order', 'name')
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'results': serializer.data,
            'count': len(serializer.data)
        })
    
    def create(self, request, *args, **kwargs):
        """Create a new custom content type"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Save the content type
        content_type = serializer.save()
        
        # Create audit log
        create_audit_log(
            user=request.user,
            action_type=ActionType.CREATE,
            description=f"Created custom content type: {content_type.name} (slug: {content_type.slug})",
            content_object=content_type,
            request=request
        )
        
        # Return full serializer with all fields
        return Response(
            PostContentTypeSerializer(content_type).data,
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        """Update a custom content type (system types are locked)"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Validation: Cannot update system types
        if instance.is_system:
            return Response(
                {'error': 'Cannot modify system content types'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Create audit log
        create_audit_log(
            user=request.user,
            action_type=ActionType.UPDATE,
            description=f"Updated custom content type: {instance.name}",
            content_object=instance,
            request=request
        )
        
        return Response(PostContentTypeSerializer(instance).data)
    
    def partial_update(self, request, *args, **kwargs):
        """Partial update (PATCH) - same rules as full update"""
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Delete a custom content type (system types cannot be deleted)"""
        instance = self.get_object()
        
        # Validation: Cannot delete system types
        if instance.is_system:
            return Response(
                {'error': 'Cannot delete system content types'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Validation: Cannot delete if posts exist
        posts_count = instance.posts.count()
        if posts_count > 0:
            return Response(
                {
                    'error': f'Cannot delete content type "{instance.name}" because it is used by {posts_count} post(s)',
                    'posts_count': posts_count
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Safe to delete
        content_type_name = instance.name
        
        # Create audit log before deletion
        create_audit_log(
            user=request.user,
            action_type=ActionType.DELETE,
            description=f"Deleted custom content type: {content_type_name}",
            request=request
        )
        
        instance.delete()
        
        return Response(
            {'message': f'Content type "{content_type_name}" deleted successfully'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['patch'], url_path='toggle-enabled')
    def toggle_enabled(self, request, pk=None):
        """
        Toggle is_enabled for a content type
        Note: Per requirements, system types cannot be disabled.
        Only custom types can be toggled.
        """
        instance = self.get_object()
        
        # Validation: Cannot disable system types
        if instance.is_system:
            return Response(
                {'error': 'Cannot disable system content types'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Toggle enabled state
        instance.is_enabled = not instance.is_enabled
        instance.save(update_fields=['is_enabled'])
        
        # Create audit log
        create_audit_log(
            user=request.user,
            action_type=ActionType.UPDATE,
            description=f"{'Enabled' if instance.is_enabled else 'Disabled'} content type: {instance.name}",
            content_object=instance,
            request=request
        )
        
        return Response({
            'message': f'Content type "{instance.name}" {"enabled" if instance.is_enabled else "disabled"}',
            'is_enabled': instance.is_enabled
        })
    
    @action(detail=False, methods=['get'], url_path='enabled')
    def enabled_only(self, request):
        """Get only enabled content types (for post creation dropdowns)"""
        queryset = self.get_queryset().filter(is_enabled=True).order_by('sort_order', 'name')
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'results': serializer.data,
            'count': len(serializer.data)
        })
