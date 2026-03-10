"""
Interaction Admin Views
Admin endpoints for managing comments, reactions, and questions
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from apps.users.permissions import IsModerator, HasModulePermission
from apps.content.views import create_audit_log
from apps.moderation.models import ActionType
from .models import Comment, Reaction, Question
from .serializers import (
    CommentSerializer, ReactionSerializer, QuestionSerializer,
    QuestionAnswerSerializer
)


class AdminCommentViewSet(viewsets.ModelViewSet):
    """
    Admin viewset for moderating comments
    Accessible by ADMIN and MODERATORs with community.moderation permission
    """
    permission_classes = [IsAuthenticated, IsModerator]

    def get_permissions(self):
        return [IsAuthenticated(), HasModulePermission('community.moderation')]
    serializer_class = CommentSerializer
    queryset = Comment.objects.filter(is_deleted=False)
    
    def get_queryset(self):
        queryset = Comment.objects.filter(is_deleted=False)
        
        # Filter by flagged
        is_flagged = self.request.query_params.get('is_flagged')
        if is_flagged is not None:
            queryset = queryset.filter(is_flagged=is_flagged.lower() == 'true')
        
        # Filter by post
        post_id = self.request.query_params.get('post')
        if post_id:
            queryset = queryset.filter(post_id=post_id)
        
        return queryset.order_by('-created_at')
    
    def perform_destroy(self, instance):
        """Soft delete comment"""
        instance.soft_delete(self.request.user)
        
        create_audit_log(
            user=self.request.user,
            action_type=ActionType.COMMENT_DELETE,
            description=f"Deleted comment by {instance.user.email}",
            content_object=instance,
            request=self.request
        )
    
    @action(detail=True, methods=['post'])
    def flag(self, request, pk=None):
        """Flag a comment for review"""
        comment = self.get_object()
        comment.is_flagged = True
        comment.flagged_reason = request.data.get('reason', 'Inappropriate content')
        comment.save()
        
        create_audit_log(
            user=request.user,
            action_type=ActionType.UPDATE,
            description=f"Flagged comment: {comment.flagged_reason}",
            content_object=comment,
            request=request
        )
        
        return Response({'message': 'Comment flagged successfully'})
    
    @action(detail=True, methods=['post'])
    def unflag(self, request, pk=None):
        """Remove flag from comment"""
        comment = self.get_object()
        comment.is_flagged = False
        comment.flagged_reason = ''
        comment.save()
        
        return Response({'message': 'Comment unflagged successfully'})


class AdminQuestionViewSet(viewsets.ModelViewSet):
    """
    Admin viewset for managing questions
    Accessible by ADMIN and MODERATORs with community.moderation permission
    """
    permission_classes = [IsAuthenticated, IsModerator]

    def get_permissions(self):
        return [IsAuthenticated(), HasModulePermission('community.moderation')]
    serializer_class = QuestionSerializer
    queryset = Question.objects.all()
    
    def get_queryset(self):
        queryset = Question.objects.all()
        
        # Filter by closed status
        is_closed = self.request.query_params.get('is_closed')
        if is_closed is not None:
            queryset = queryset.filter(is_closed=is_closed.lower() == 'true')
        
        # Filter unanswered
        unanswered = self.request.query_params.get('unanswered')
        if unanswered == 'true':
            queryset = queryset.filter(answer_text='')
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def answer(self, request, pk=None):
        """Answer a question"""
        question = self.get_object()
        serializer = QuestionAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        question.answer(
            admin_user=request.user,
            answer_text=serializer.validated_data['answer_text']
        )
        question.is_public = serializer.validated_data.get('is_public', False)
        question.save()
        
        create_audit_log(
            user=request.user,
            action_type=ActionType.QUESTION_ANSWER,
            description=f"Answered question from {question.user.email}",
            content_object=question,
            request=request
        )
        
        return Response({
            'message': 'Question answered successfully',
            'question': QuestionSerializer(question).data
        })
    
    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """Close a question"""
        question = self.get_object()
        question.close()
        
        create_audit_log(
            user=request.user,
            action_type=ActionType.UPDATE,
            description=f"Closed question from {question.user.email}",
            content_object=question,
            request=request
        )
        
        return Response({'message': 'Question closed successfully'})
