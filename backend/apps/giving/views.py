"""Views for giving items API."""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import GivingItem
from .serializers import GivingItemSerializer, PublicGivingItemSerializer


class GivingItemViewSet(viewsets.ModelViewSet):
    """ViewSet for giving item CRUD operations."""
    
    queryset = GivingItem.objects.all()
    serializer_class = GivingItemSerializer

    @staticmethod
    def _is_admin_user(user):
        if not user or not user.is_authenticated:
            return False

        role = str(getattr(user, 'role', '')).lower()
        return bool(
            getattr(user, 'is_staff', False)
            or getattr(user, 'is_superuser', False)
            or role in {'admin', 'super_admin'}
        )
    
    def get_permissions(self):
        """Allow public read access, require auth for modifications."""
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        """Filter based on action - public vs admin."""
        queryset = super().get_queryset()
        
        # Admin access (authenticated) - show all items
        if self._is_admin_user(self.request.user):
            return queryset.order_by('display_order', '-created_at')
        
        # Public access - only active and public items
        return queryset.filter(
            status='active',
            visibility__in=['public', 'PUBLIC']
        ).order_by('display_order', '-created_at')
    
    def get_serializer_class(self):
        """Use public serializer for unauthenticated requests."""
        if not self.request.user.is_authenticated:
            return PublicGivingItemSerializer
        return GivingItemSerializer
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def reorder(self, request):
        """
        Reorder giving items.
        
        Expects: { "items": [{ "id": "uuid", "display_order": 1 }, ...] }
        """
        items_data = request.data.get('items', [])
        
        if not items_data:
            return Response(
                {'error': 'Items array required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Update display_order for each item
            updated_count = 0
            for item_data in items_data:
                item_id = item_data.get('id')
                new_order = item_data.get('display_order')
                
                if item_id and new_order is not None:
                    GivingItem.objects.filter(id=item_id).update(display_order=new_order)
                    updated_count += 1
            
            return Response({
                'message': f'Successfully reordered {updated_count} items',
                'updated_count': updated_count
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
