"""
Comment and Reaction URLs
Public and member interaction endpoints
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .comment_views import PublicCommentViewSet, MemberCommentViewSet, AdminCommentViewSet
from .reaction_views import react_to_post, get_post_reactions

app_name = 'comments'

# Public router (read-only)
public_router = DefaultRouter()
public_router.register(r'public/comments', PublicCommentViewSet, basename='public-comment')

# Member router (authenticated)
member_router = DefaultRouter()
member_router.register(r'comments', MemberCommentViewSet, basename='member-comment')

# Admin router
admin_router = DefaultRouter()
admin_router.register(r'admin/comments', AdminCommentViewSet, basename='admin-comment')

urlpatterns = [
    path('', include(public_router.urls)),
    path('', include(member_router.urls)),
    path('', include(admin_router.urls)),
    
    # Reaction endpoints
    path('posts/<uuid:post_id>/reaction/', react_to_post, name='react-to-post'),
    path('posts/<uuid:post_id>/reactions/', get_post_reactions, name='get-post-reactions'),
]
