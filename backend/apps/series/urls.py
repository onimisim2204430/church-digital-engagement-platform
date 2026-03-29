"""
Series App URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AdminSeriesViewSet, SeriesAnnouncementRequestViewSet

app_name = 'series'

router = DefaultRouter()
router.register(r'announcement-requests', SeriesAnnouncementRequestViewSet, basename='series-announcement-request')
router.register(r'', AdminSeriesViewSet, basename='admin-series')

urlpatterns = [
    path('', include(router.urls)),
]
