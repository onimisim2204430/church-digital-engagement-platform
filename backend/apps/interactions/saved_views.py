"""
Saved Post Views
Authenticated member endpoints for saving and listing posts.
"""

from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.content.models import Post
from .models import SavedPost


def _class_a_type_filter() -> Q:
    # Class A: multipart series/disciplship-oriented content.
    return (
        Q(content_type__slug__in=['series', 'discipleship', 'sermon', 'article'])
        | (Q(content_type__isnull=True) & Q(post_type__in=['SERMON', 'ARTICLE']))
    )


def _class_a_series_ids_qs():
    from apps.series.models import Series

    return (
        Series.objects.filter(is_deleted=False)
        .annotate(parts_count=Count('posts', filter=Q(posts__is_deleted=False)))
        .filter(parts_count__gte=2)
        .values_list('id', flat=True)
    )


def _base_class_a_posts_qs():
    return (
        Post.objects.filter(
            _class_a_type_filter(),
            is_deleted=False,
            is_published=True,
            series__isnull=False,
            series__is_deleted=False,
            series_id__in=_class_a_series_ids_qs(),
        )
        .select_related('author', 'series')
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_saved_post(request, post_id):
    """Toggle save/unsave for a class-A eligible post."""

    post = get_object_or_404(_base_class_a_posts_qs(), id=post_id)

    saved = SavedPost.objects.filter(user=request.user, post=post).first()
    if saved:
        saved.delete()
        return Response({'saved': False, 'post_id': str(post.id)}, status=status.HTTP_200_OK)

    SavedPost.objects.create(user=request.user, post=post)
    return Response({'saved': True, 'post_id': str(post.id)}, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_member_saved_posts(request):
    """List saved class-A posts for the authenticated member."""

    saved_items = (
        SavedPost.objects.filter(
            user=request.user,
            post__in=_base_class_a_posts_qs(),
        )
        .select_related('post', 'post__author', 'post__series')
        .order_by('-saved_at')
    )

    results = []
    for item in saved_items:
        post = item.post
        speaker_name = post.author.get_full_name().strip() if post.author and post.author.get_full_name().strip() else (post.author.email if post.author else '')
        speaker_avatar = None
        if post.author and post.author.profile_picture:
            url = post.author.profile_picture.url
            speaker_avatar = request.build_absolute_uri(url)

        results.append(
            {
                'id': str(item.id),
                'saved_at': item.saved_at,
                'post': {
                    'id': str(post.id),
                    'title': post.title,
                    'content': post.content,
                    'speaker_name': speaker_name,
                    'speaker_avatar': speaker_avatar,
                    'series_id': str(post.series_id) if post.series_id else None,
                    'series_title': post.series.title if post.series_id else None,
                    'featured_image': post.featured_image,
                    'published_at': post.published_at,
                    'created_at': post.created_at,
                },
            }
        )

    return Response({'results': results}, status=status.HTTP_200_OK)
