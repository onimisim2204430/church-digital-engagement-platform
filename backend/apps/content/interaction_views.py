"""
Interaction Views
Handles moderation of comments, questions, and flagged content
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.utils import timezone

from .models import Interaction, InteractionStatus, InteractionType
from .interaction_serializers import (
    InteractionListSerializer,
    InteractionDetailSerializer,
    InteractionCreateSerializer,
    InteractionResponseSerializer,
    InteractionFlagSerializer,
    InteractionUpdateSerializer
)
from apps.users.permissions import IsAdmin, IsModerator


class InteractionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing interactions (comments, questions, flags)
    
    Access Control:
    - Admin: Full access to all interactions
    - Moderator: Can view all, respond only to questions on own posts
    - Members: Can create interactions, view their own
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter interactions based on user role"""
        user = self.request.user
        
        # Base queryset - exclude deleted
        queryset = Interaction.objects.filter(is_deleted=False).select_related(
            'post', 'user', 'flagged_by', 'responded_by'
        ).prefetch_related('replies')
        
        # Admin sees everything
        if user.role == 'ADMIN':
            return queryset
        
        # Moderator sees all interactions but can only respond to questions on their posts
        if user.role == 'MODERATOR':
            return queryset
        
        # Members see only their own interactions
        return queryset.filter(user=user)
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'retrieve':
            return InteractionDetailSerializer
        elif self.action == 'create':
            return InteractionCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return InteractionUpdateSerializer
        return InteractionListSerializer
    
    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['list', 'retrieve', 'stats']:
            # Moderators and admins can view
            return [IsAuthenticated(), IsModerator()]
        elif self.action in ['destroy', 'bulk_action']:
            # Only admins can delete
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]
    
    def list(self, request, *args, **kwargs):
        """List interactions with filtering"""
        queryset = self.get_queryset()
        
        # Filters
        interaction_type = request.query_params.get('type')
        interaction_status = request.query_params.get('status')
        is_question = request.query_params.get('is_question')
        is_flagged = request.query_params.get('is_flagged')
        post_id = request.query_params.get('post_id')
        
        if interaction_type:
            queryset = queryset.filter(type=interaction_type.upper())
        
        if interaction_status:
            queryset = queryset.filter(status=interaction_status.upper())
        
        if is_question is not None:
            queryset = queryset.filter(is_question=(is_question.lower() == 'true'))
        
        if is_flagged is not None:
            queryset = queryset.filter(is_flagged=(is_flagged.lower() == 'true'))
        
        if post_id:
            queryset = queryset.filter(post_id=post_id)
        
        # Pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        """Create new interaction (comment/question)"""
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        interaction = serializer.save()
        
        # Return detailed view
        detail_serializer = InteractionDetailSerializer(interaction, context={'request': request})
        return Response(detail_serializer.data, status=status.HTTP_201_CREATED)
    
    def check_response_permission(self, interaction):
        """Check if user can respond to this interaction"""
        user = self.request.user
        
        # Admin can respond to anything
        if user.role == 'ADMIN':
            return True
        
        # Moderator can respond only to questions on their own posts
        if user.role == 'MODERATOR':
            if interaction.is_question and interaction.post.author_id == user.id:
                return True
            return False
        
        return False
    
    @action(detail=True, methods=['post'])
    def respond(self, request, pk=None):
        """Respond to a question"""
        interaction = self.get_object()
        
        # Check if it's a question
        if not interaction.is_question:
            return Response(
                {'error': 'Can only respond to questions'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check permissions
        if not self.check_response_permission(interaction):
            return Response(
                {'error': 'You do not have permission to respond to this question'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Validate response
        serializer = InteractionResponseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create reply in Interaction table
        reply = Interaction.objects.create(
            post=interaction.post,
            user=request.user,
            parent=interaction,
            content=serializer.validated_data['content'],
            type=InteractionType.COMMENT,
            status=InteractionStatus.CLOSED
        )
        
        # Also create reply in Comment table so member can see it on the public page
        from apps.interactions.models import Comment
        
        # Find the original comment that matches this interaction
        original_comment = Comment.objects.filter(
            post=interaction.post,
            user=interaction.user,
            content=interaction.content,
            is_question=True
        ).first()
        
        if original_comment:
            # Create the reply as a Comment
            Comment.objects.create(
                post=interaction.post,
                user=request.user,
                parent=original_comment,
                content=serializer.validated_data['content'],
                is_question=False
            )
            
            # Mark the original comment as answered
            original_comment.question_status = 'ANSWERED'
            original_comment.answered_by = request.user
            original_comment.answered_at = timezone.now()
            original_comment.save(update_fields=['question_status', 'answered_by', 'answered_at'])
        
        # Mark question as answered in Interaction table
        interaction.mark_answered(request.user)
        
        # Return updated interaction with replies
        detail_serializer = InteractionDetailSerializer(interaction, context={'request': request})
        return Response(detail_serializer.data)
    
    @action(detail=True, methods=['post'])
    def flag(self, request, pk=None):
        """Flag an interaction as inappropriate"""
        interaction = self.get_object()
        
        # Members can flag comments
        if interaction.is_flagged:
            return Response(
                {'error': 'This interaction is already flagged'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = InteractionFlagSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        interaction.flag(request.user, serializer.validated_data.get('reason', ''))
        
        return Response({'message': 'Interaction flagged successfully'})
    
    @action(detail=True, methods=['post'])
    def mark_reviewed(self, request, pk=None):
        """Mark flagged interaction as reviewed (admin only)"""
        if request.user.role != 'ADMIN':
            return Response(
                {'error': 'Only admins can mark items as reviewed'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        interaction = self.get_object()
        
        if not interaction.is_flagged:
            return Response(
                {'error': 'This interaction is not flagged'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        interaction.status = InteractionStatus.REVIEWED
        interaction.save(update_fields=['status', 'updated_at'])
        
        serializer = self.get_serializer(interaction)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def hide(self, request, pk=None):
        """Hide interaction from public view (admin only)"""
        if request.user.role != 'ADMIN':
            return Response(
                {'error': 'Only admins can hide interactions'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        interaction = self.get_object()
        interaction.hide()
        
        # Also soft-delete the corresponding Comment if it exists
        from apps.interactions.models import Comment
        Comment.objects.filter(
            post=interaction.post,
            user=interaction.user,
            content=interaction.content,
            is_question=True
        ).update(is_deleted=True)
        
        serializer = self.get_serializer(interaction)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def unhide(self, request, pk=None):
        """Unhide interaction (admin only)"""
        if request.user.role != 'ADMIN':
            return Response(
                {'error': 'Only admins can unhide interactions'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        interaction = self.get_object()
        interaction.is_hidden = False
        interaction.save(update_fields=['is_hidden', 'updated_at'])
        
        # Also restore the corresponding Comment if it exists
        from apps.interactions.models import Comment
        Comment.objects.filter(
            post=interaction.post,
            user=interaction.user,
            content=interaction.content,
            is_question=True
        ).update(is_deleted=False)
        
        serializer = self.get_serializer(interaction)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """Close interaction"""
        interaction = self.get_object()
        
        # Check permissions
        if not self.check_response_permission(interaction):
            return Response(
                {'error': 'You do not have permission to close this interaction'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        interaction.close()
        
        serializer = self.get_serializer(interaction)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get interaction statistics for dashboard"""
        user = request.user
        queryset = self.get_queryset()
        
        # Questions stats
        if user.role == 'MODERATOR':
            # Moderators see only questions on their posts
            my_posts_questions = queryset.filter(
                is_question=True,
                post__author_id=user.id
            )
            unanswered_questions = my_posts_questions.filter(status=InteractionStatus.OPEN).count()
            answered_questions = my_posts_questions.filter(status=InteractionStatus.ANSWERED).count()
        else:
            # Admins see all
            unanswered_questions = queryset.filter(
                is_question=True,
                status=InteractionStatus.OPEN
            ).count()
            answered_questions = queryset.filter(
                is_question=True,
                status=InteractionStatus.ANSWERED
            ).count()
        
        # Flagged items (admin only)
        flagged_pending = 0
        flagged_reviewed = 0
        if user.role == 'ADMIN':
            flagged_pending = queryset.filter(
                is_flagged=True,
                status=InteractionStatus.PENDING
            ).count()
            flagged_reviewed = queryset.filter(
                is_flagged=True,
                status=InteractionStatus.REVIEWED
            ).count()
        
        # Total comments
        total_comments = queryset.filter(type=InteractionType.COMMENT).count()
        
        return Response({
            'unanswered_questions': unanswered_questions,
            'answered_questions': answered_questions,
            'flagged_pending': flagged_pending,
            'flagged_reviewed': flagged_reviewed,
            'total_comments': total_comments
        })
    
    @action(detail=False, methods=['post'])
    def bulk_action(self, request):
        """Bulk action on multiple interactions (admin only)"""
        if request.user.role != 'ADMIN':
            return Response(
                {'error': 'Only admins can perform bulk actions'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        interaction_ids = request.data.get('ids', [])
        action_type = request.data.get('action')
        
        if not interaction_ids or not action_type:
            return Response(
                {'error': 'Missing ids or action'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        interactions = self.get_queryset().filter(id__in=interaction_ids)
        
        if action_type == 'hide':
            interactions.update(is_hidden=True)
        elif action_type == 'delete':
            interactions.update(is_deleted=True)
        elif action_type == 'mark_reviewed':
            interactions.filter(is_flagged=True).update(status=InteractionStatus.REVIEWED)
        else:
            return Response(
                {'error': f'Unknown action: {action_type}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({'message': f'Bulk {action_type} completed', 'count': interactions.count()})
