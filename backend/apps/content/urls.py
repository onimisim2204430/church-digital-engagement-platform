"""
Content App URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AdminPostViewSet,
    AdminDailyWordViewSet,
    AdminWeeklyEventViewSet,
    AdminEventViewSet,
    AdminConnectMinistryViewSet,
    AdminHeroSectionViewSet,
    AdminTestimonialViewSet,
    AdminSpiritualPracticeViewSet,
    AdminPrivacyPolicyAPIView,
)
from .content_type_views import ContentTypeViewSet
from .interaction_views import InteractionViewSet
from .draft_views import DraftViewSet
from .upload_views import ImageUploadView

app_name = 'content'

# Admin router - for authenticated admin endpoints
admin_router = DefaultRouter()
admin_router.register(r'posts', AdminPostViewSet, basename='admin-post')
admin_router.register(r'daily-words', AdminDailyWordViewSet, basename='admin-daily-word')
admin_router.register(r'weekly-events', AdminWeeklyEventViewSet, basename='admin-weekly-event')
admin_router.register(r'events', AdminEventViewSet, basename='admin-event')
admin_router.register(r'connect-ministries', AdminConnectMinistryViewSet, basename='admin-connect-ministry')
admin_router.register(r'hero-sections', AdminHeroSectionViewSet, basename='admin-hero-section')
admin_router.register(r'testimonials', AdminTestimonialViewSet, basename='admin-testimonial')
admin_router.register(r'spiritual-practices', AdminSpiritualPracticeViewSet, basename='admin-spiritual-practice')
admin_router.register(r'content-types', ContentTypeViewSet, basename='content-type')
admin_router.register(r'interactions', InteractionViewSet, basename='interaction')
admin_router.register(r'drafts', DraftViewSet, basename='draft')

urlpatterns = [
    path('', include(admin_router.urls)),
    path('upload/image/', ImageUploadView.as_view(), name='upload-image'),
    path('privacy-policy/', AdminPrivacyPolicyAPIView.as_view(), name='admin-privacy-policy'),
]

