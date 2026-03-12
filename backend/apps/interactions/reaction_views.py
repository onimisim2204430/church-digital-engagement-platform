"""
Reaction Views - Production-grade post reactions
Authenticated members can react to posts
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.contrib.contenttypes.models import ContentType

from apps.content.models import Post
from apps.moderation.models import AuditLog, ActionType
from .models import Reaction, ReactionType
from .serializers import ReactionSerializer, ReactionStatsSerializer


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def react_to_post(request, post_id):
    """
    Create, update, or remove a reaction on a post
    POST /api/v1/posts/{post_id}/reaction/
    
    Body: {"type": "AMEN"}
    
    Behavior:
    - If user has no reaction: Create new reaction
    - If user has same reaction: Remove reaction (toggle off)
    - If user has different reaction: Update to new type
    """
    post = get_object_or_404(Post, id=post_id)
    
    # Validate post state
    if not post.is_published:
        return Response(
            {"error": "Cannot react to unpublished posts."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not post.reactions_enabled:
        return Response(
            {"error": "Reactions are disabled for this post."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if post.is_deleted:
        return Response(
            {"error": "Cannot react to deleted posts."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate reaction type
    serializer = ReactionSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    reaction_type = serializer.validated_data['reaction_type']
    
    # Get existing reaction if any
    existing_reaction = Reaction.objects.filter(
        post=post,
        user=request.user
    ).first()
    
    # Case 1: User clicking same reaction again → Remove it
    if existing_reaction and existing_reaction.reaction_type == reaction_type:
        existing_reaction.delete()
        
        # Audit log
        AuditLog.objects.create(
            user=request.user,
            action_type=ActionType.DELETE,
            description=f"Removed {reaction_type} reaction from post: {post.title}",
            content_type=ContentType.objects.get_for_model(Reaction),
            object_id=str(existing_reaction.id),
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]
        )
        
        return Response(
            {"message": "Reaction removed", "reaction": None},
            status=status.HTTP_200_OK
        )
    
    # Case 2: User has different reaction → Update it
    elif existing_reaction:
        old_type = existing_reaction.reaction_type
        old_emoji = existing_reaction.emoji
        existing_reaction.reaction_type = reaction_type
        existing_reaction.emoji = serializer.validated_data['emoji']
        existing_reaction.save()
        
        # Audit log
        AuditLog.objects.create(
            user=request.user,
            action_type=ActionType.UPDATE,
            description=f"Changed reaction from {old_emoji} to {serializer.validated_data['emoji']} on post: {post.title}",
            content_type=ContentType.objects.get_for_model(Reaction),
            object_id=str(existing_reaction.id),
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]
        )
        
        return Response(
            {"message": "Reaction updated", "reaction": serializer.validated_data['emoji']},
            status=status.HTTP_200_OK
        )
    
    # Case 3: User has no reaction → Create new one
    else:
        new_reaction = Reaction.objects.create(
            post=post,
            user=request.user,
            reaction_type=reaction_type,
            emoji=serializer.validated_data['emoji']
        )
        
        # Audit log
        AuditLog.objects.create(
            user=request.user,
            action_type=ActionType.CREATE,
            description=f"Added {serializer.validated_data['emoji']} reaction to post: {post.title}",
            content_type=ContentType.objects.get_for_model(Reaction),
            object_id=str(new_reaction.id),
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]
        )
        
        return Response(
            {"message": "Reaction created", "reaction": serializer.validated_data['emoji']},
            status=status.HTTP_201_CREATED
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def get_post_reactions(request, post_id):
    """
    Get reaction statistics for a post (emoji-based)
    GET /api/v1/posts/{post_id}/reactions/
    
    Response:
    {
      "reactions": [
        {"emoji": "🙏", "count": 24},
        {"emoji": "👍", "count": 10},
        {"emoji": "❤️", "count": 6}
      ],
      "user_reaction": "🙏"  // null if not authenticated
    }
    """
    post = get_object_or_404(Post, id=post_id)
    
    # Emoji mapping
    CODE_TO_EMOJI = {
        'LIKE': '👍',
        'AMEN': '🙏',
        'LOVE': '❤️',
        'INSIGHT': '💡',
        'PRAISE': '🎉',
    }
    
    # Get reaction counts grouped by emoji
    reactions_list = []
    for reaction_type, _ in ReactionType.choices:
        count = Reaction.objects.filter(
            post=post,
            reaction_type=reaction_type
        ).count()
        emoji = CODE_TO_EMOJI.get(reaction_type, '👍')
        reactions_list.append({
            'emoji': emoji,
            'count': count
        })
    
    # Get user's reaction if authenticated
    user_reaction = None
    if request.user.is_authenticated:
        user_reaction_obj = Reaction.objects.filter(
            post=post,
            user=request.user
        ).first()
        if user_reaction_obj:
            user_reaction = user_reaction_obj.emoji
    
    data = {
        'reactions': reactions_list,
        'user_reaction': user_reaction
    }
    
    serializer = ReactionStatsSerializer(data)
    return Response(serializer.data, status=status.HTTP_200_OK)
