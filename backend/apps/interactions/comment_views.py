"""
Comment Views - Public and Authenticated
Production-grade comment system
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType

from apps.users.permissions import IsAdmin, IsMember, IsModerator
from apps.moderation.models import AuditLog, ActionType
from .models import Comment
from .serializers import CommentSerializer, CommentCreateSerializer


class CommentPermission:
    """Custom permission for comment operations"""
    
    @staticmethod
    def can_comment():
        """Returns permission class for creating comments"""
        return IsAuthenticated
    
    @staticmethod
    def can_view():
        """Returns permission class for viewing comments"""
        return AllowAny


class PublicCommentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public endpoint for reading comments
    Anyone can view, authenticated members can comment
    """
    permission_classes = [AllowAny]
    serializer_class = CommentSerializer
    
    def get_queryset(self):
        """Get comments for a specific post"""
        post_id = self.request.query_params.get('post_id')
        if not post_id:
            return Comment.objects.none()
        
        # Only return top-level comments (no parent)
        # Replies are included in the nested 'replies' field
        queryset = Comment.objects.filter(
            post_id=post_id,
            parent__isnull=True
        ).select_related('user', 'post').prefetch_related('replies').order_by('-created_at')
        
        # Filter questions based on user role
        user = self.request.user
        if not user.is_authenticated:
            # Anonymous users cannot see questions
            queryset = queryset.exclude(is_question=True)
        elif user.role not in ['ADMIN', 'MODERATOR']:
            # Regular members can only see their own questions
            from django.db.models import Q
            queryset = queryset.exclude(
                Q(is_question=True) & ~Q(user=user)
            )
        # Admins and Moderators see all questions
        
        return queryset


class MemberCommentViewSet(viewsets.ModelViewSet):
    """
    Member endpoint for creating and managing own comments
    POST /api/v1/posts/{post_id}/comments/ - Create comment
    POST /api/v1/comments/{comment_id}/replies/ - Create reply
    """
    permission_classes = [IsAuthenticated]
    serializer_class = CommentSerializer
    
    def get_serializer_class(self):
        if self.action == 'create' or self.action == 'reply':
            return CommentCreateSerializer
        return CommentSerializer
    
    def get_queryset(self):
        """
        Get comments based on action:
        - For reply action: Filter based on user role and question visibility
        - For other actions: User's own comments
        """
        user = self.request.user
        
        if self.action == 'reply':
            queryset = Comment.objects.all()
            # Filter questions in replies based on user role
            if user.role not in ['ADMIN', 'MODERATOR']:
                from django.db.models import Q
                queryset = queryset.exclude(
                    Q(is_question=True) & ~Q(user=user)
                )
            return queryset
        
        return Comment.objects.filter(user=user).order_by('-created_at')
    
    def create(self, request, *args, **kwargs):
        """Create a new comment"""
        # Check if post allows comments BEFORE validation
        from apps.content.models import Post
        post_id = request.data.get('post')
        if post_id:
            try:
                post = Post.objects.get(id=post_id)
                if not post.comments_enabled:
                    return Response(
                        {"error": "Comments are disabled for this post."},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except Post.DoesNotExist:
                pass  # Let serializer validation handle this
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create comment with current user
        comment = serializer.save(user=request.user)
        
        # If this is a question, also create an Interaction record for moderation tracking
        if comment.is_question:
            from apps.content.models import Interaction, InteractionType, InteractionStatus
            Interaction.objects.create(
                post=comment.post,
                user=request.user,
                content=comment.content,
                type=InteractionType.QUESTION,
                is_question=True,
                status=InteractionStatus.OPEN
            )
        
        # Create audit log
        AuditLog.objects.create(
            user=request.user,
            action_type=ActionType.CREATE,
            description=f"Created comment on post: {comment.post.title}",
            content_type=ContentType.objects.get_for_model(Comment),
            object_id=str(comment.id),
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]
        )
        
        # Return full comment data
        response_serializer = CommentSerializer(comment)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'], url_path='reply')
    def reply(self, request, pk=None):
        """Reply to a specific comment"""
        parent_comment = self.get_object()
        
        # Validate post allows comments
        if not parent_comment.post.comments_enabled:
            return Response(
                {"error": "Comments are disabled for this post."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Add parent to request data
        data = request.data.copy()
        data['parent'] = str(parent_comment.id)
        data['post'] = str(parent_comment.post.id)
        
        serializer = CommentCreateSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        
        # Create reply with current user
        comment = serializer.save(user=request.user)
        
        # FOLLOW-UP QUESTION LOGIC: If replying to own answered question with a new question,
        # reopen the original interaction instead of creating a new one
        if comment.is_question and parent_comment.is_question and parent_comment.user == request.user:
            # This is a follow-up question by the original asker
            from apps.content.models import Interaction, InteractionStatus
            
            # Find and reopen the original interaction
            original_interaction = Interaction.objects.filter(
                post=parent_comment.post,
                user=parent_comment.user,
                content=parent_comment.content,
                is_question=True
            ).first()
            
            if original_interaction:
                # Reopen the question (change status from ANSWERED back to OPEN)
                original_interaction.status = InteractionStatus.OPEN
                original_interaction.responded_by = None
                original_interaction.responded_at = None
                original_interaction.save(update_fields=['status', 'responded_by', 'responded_at', 'updated_at'])
                
                # Also update the parent comment status
                parent_comment.question_status = 'OPEN'
                parent_comment.answered_by = None
                parent_comment.answered_at = None
                parent_comment.save(update_fields=['question_status', 'answered_by', 'answered_at'])
                
                # DO NOT create a new Interaction - the reply is just a nested comment
            else:
                # Original interaction not found, create new one
                from apps.content.models import Interaction, InteractionType
                Interaction.objects.create(
                    post=comment.post,
                    user=request.user,
                    content=comment.content,
                    type=InteractionType.QUESTION,
                    is_question=True,
                    status=InteractionStatus.OPEN
                )
        elif comment.is_question:
            # This is a new standalone question (not a follow-up)
            from apps.content.models import Interaction, InteractionType, InteractionStatus
            Interaction.objects.create(
                post=comment.post,
                user=request.user,
                content=comment.content,
                type=InteractionType.QUESTION,
                is_question=True,
                status=InteractionStatus.OPEN
            )
        
        # If replying to a question and user is moderator/admin, mark question as answered
        if parent_comment.is_question and request.user.role in ['ADMIN', 'MODERATOR']:
            parent_comment.question_status = 'ANSWERED'
            parent_comment.answered_by = request.user
            parent_comment.answered_at = timezone.now()
            parent_comment.save(update_fields=['question_status', 'answered_by', 'answered_at'])
            
            # Also update the corresponding Interaction record if it exists
            from apps.content.models import Interaction, InteractionStatus
            Interaction.objects.filter(
                post=parent_comment.post,
                user=parent_comment.user,
                content=parent_comment.content,
                is_question=True
            ).update(
                status=InteractionStatus.ANSWERED,
                responded_by=request.user,
                responded_at=timezone.now()
            )
        
        # Create audit log
        AuditLog.objects.create(
            user=request.user,
            action_type=ActionType.CREATE,
            description=f"Replied to comment on post: {comment.post.title}",
            content_type=ContentType.objects.get_for_model(Comment),
            object_id=str(comment.id),
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]
        )
        
        # Return full comment data
        response_serializer = CommentSerializer(comment)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class AdminCommentViewSet(viewsets.ModelViewSet):
    """
    Admin endpoint for moderating comments
    DELETE /api/v1/admin/comments/{id}/ - Soft delete comment
    PATCH /api/v1/admin/comments/{id}/restore/ - Restore deleted comment
    Accessible by ADMIN and MODERATOR
    """
    permission_classes = [IsAuthenticated, IsModerator]
    serializer_class = CommentSerializer
    queryset = Comment.objects.all().select_related('user', 'post').order_by('-created_at')
    
    def destroy(self, request, *args, **kwargs):
        """Soft delete comment (preserves thread structure)"""
        comment = self.get_object()
        
        if comment.is_deleted:
            return Response(
                {'detail': 'Comment already deleted'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Soft delete
        comment.soft_delete(user=request.user)
        
        # Create audit log
        AuditLog.objects.create(
            user=request.user,
            action_type=ActionType.DELETE,
            description=f"Deleted comment on post: {comment.post.title}",
            content_type=ContentType.objects.get_for_model(Comment),
            object_id=str(comment.id),
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]
        )
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['patch'])
    def restore(self, request, pk=None):
        """Restore a deleted comment"""
        comment = self.get_object()
        
        if not comment.is_deleted:
            return Response(
                {'detail': 'Comment is not deleted'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Restore
        comment.is_deleted = False
        comment.deleted_at = None
        comment.deleted_by = None
        comment.save()
        
        # Create audit log
        AuditLog.objects.create(
            user=request.user,
            action_type=ActionType.UPDATE,
            description=f"Restored comment on post: {comment.post.title}",
            content_type=ContentType.objects.get_for_model(Comment),
            object_id=str(comment.id),
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]
        )
        
        serializer = self.get_serializer(comment)
        return Response(serializer.data)
