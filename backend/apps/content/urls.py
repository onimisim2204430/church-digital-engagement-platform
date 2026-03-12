"""
Content App URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AdminPostViewSet, AdminDailyWordViewSet, AdminWeeklyEventViewSet
from .content_type_views import ContentTypeViewSet
from .interaction_views import InteractionViewSet
from .draft_views import DraftViewSet
from .upload_views import ImageUploadView

app_name = 'content'

router = DefaultRouter()
router.register(r'posts', AdminPostViewSet, basename='admin-post')
router.register(r'daily-words', AdminDailyWordViewSet, basename='admin-daily-word')
router.register(r'weekly-events', AdminWeeklyEventViewSet, basename='admin-weekly-event')
router.register(r'content-types', ContentTypeViewSet, basename='content-type')
router.register(r'interactions', InteractionViewSet, basename='interaction')
router.register(r'drafts', DraftViewSet, basename='draft')

urlpatterns = [
    path('', include(router.urls)),
    path('upload/image/', ImageUploadView.as_view(), name='upload-image'),
]

