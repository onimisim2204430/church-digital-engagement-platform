"""
Public Content URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .public_views import (
    PublicPostViewSet, public_content_types, 
    PublicDailyWordViewSet, PublicWeeklyEventViewSet, PublicEventViewSet, PublicHeroSectionViewSet,
    PublicConnectMinistryViewSet,
    PublicTestimonialViewSet,
    PublicSpiritualPracticeViewSet,
    public_privacy_policy,
)
from .home_views import home_page_content

app_name = 'public_content'

router = DefaultRouter()
router.register(r'posts', PublicPostViewSet, basename='public-post')
router.register(r'daily-words', PublicDailyWordViewSet, basename='public-daily-word')
router.register(r'weekly-events', PublicWeeklyEventViewSet, basename='public-weekly-event')
router.register(r'events', PublicEventViewSet, basename='public-event')
router.register(r'connect-ministries', PublicConnectMinistryViewSet, basename='public-connect-ministry')
router.register(r'hero-sections', PublicHeroSectionViewSet, basename='public-hero-section')
router.register(r'testimonials', PublicTestimonialViewSet, basename='public-testimonial')
router.register(r'spiritual-practices', PublicSpiritualPracticeViewSet, basename='public-spiritual-practice')

urlpatterns = [
    path('home/', home_page_content, name='home-content'),
    path('content-types/', public_content_types, name='content-types'),
    path('privacy-policy/', public_privacy_policy, name='privacy-policy'),
    path('', include(router.urls)),
]
