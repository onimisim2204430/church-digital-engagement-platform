"""
Home Page Aggregate API
Single optimized endpoint for editorial homepage
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q

from .models import Post, PostType, PostStatus, PostContentType
from .utils import generate_excerpt


@api_view(['GET'])
@permission_classes([AllowAny])
def home_page_content(request):
    """
    Aggregate API for homepage editorial content
    
    Returns structured data:
    - featured: Single featured post or latest post
    - announcements: Latest 5 announcements
    - sermons: Latest 5 sermons
    - articles: Latest 6 articles
    - latest: Latest 10 mixed content items
    
    All items include server-generated excerpts
    """
    # Base queryset: PUBLISHED status, not deleted, published_at <= now
    base_qs = Post.objects.filter(
        status=PostStatus.PUBLISHED,
        is_deleted=False,
        published_at__lte=timezone.now()
    )
    
    # Get content type slugs for filtering (fallback to old post_type if needed)
    try:
        announcement_type = PostContentType.objects.get(slug='announcement')
        sermon_type = PostContentType.objects.get(slug='sermon')
        article_type = PostContentType.objects.get(slug='article')
        discipleship_type = PostContentType.objects.get(slug='discipleship')
    except PostContentType.DoesNotExist:
        # Fallback to None if types don't exist yet
        announcement_type = sermon_type = article_type = discipleship_type = None
    
    # Featured content (highest priority featured post, or latest if none)
    featured_post = base_qs.filter(is_featured=True).order_by('-featured_priority', '-published_at').first()
    if not featured_post:
        featured_post = base_qs.order_by('-published_at').first()
    
    # Latest announcements - use content_type FK or fallback to post_type
    if announcement_type:
        announcements = base_qs.filter(content_type=announcement_type).order_by('-published_at')[:5]
    else:
        announcements = base_qs.filter(post_type=PostType.ANNOUNCEMENT).order_by('-published_at')[:5]
    
    # Recent sermons
    if sermon_type:
        sermons = base_qs.filter(content_type=sermon_type).order_by('-published_at')[:5]
    else:
        sermons = base_qs.filter(post_type=PostType.SERMON).order_by('-published_at')[:5]
    
    # Featured articles
    if article_type:
        articles = base_qs.filter(content_type=article_type).order_by('-published_at')[:6]
    else:
        articles = base_qs.filter(post_type=PostType.ARTICLE).order_by('-published_at')[:6]
    
    # Discipleship content
    if discipleship_type:
        discipleship = base_qs.filter(content_type=discipleship_type).order_by('-published_at')[:6]
    else:
        # No fallback for discipleship since it's new (won't exist in old post_type enum)
        discipleship = base_qs.none()
    
    # Latest mixed content (for "More from the Church" section)
    latest = base_qs.order_by('-published_at')[:10]
    
    # Serialize data with excerpts
    def serialize_post(post, excerpt_length=220):
        """Serialize post with server-generated excerpt"""
        return {
            'id': str(post.id),
            'title': post.title,
            'excerpt': generate_excerpt(post.content, max_length=excerpt_length),
            'type': post.get_content_type_slug(),  # Use helper method for backward compatibility
            'published_at': post.published_at.isoformat() if post.published_at else None,
            'author': {
                'first_name': post.author.first_name,
                'last_name': post.author.last_name,
            },
            'featured_image': post.featured_image,
            'views_count': post.views_count,
        }
    
    return Response({
        'featured': serialize_post(featured_post, excerpt_length=300) if featured_post else None,
        'announcements': [serialize_post(p, excerpt_length=150) for p in announcements],
        'sermons': [serialize_post(p, excerpt_length=180) for p in sermons],
        'discipleship': [serialize_post(p, excerpt_length=200) for p in discipleship],
        'articles': [serialize_post(p, excerpt_length=220) for p in articles],
        'latest': [serialize_post(p, excerpt_length=200) for p in latest],
    })
