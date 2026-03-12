"""
Series Public URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .public_views import PublicSeriesViewSet

app_name = 'series-public'

router = DefaultRouter()
router.register(r'series', PublicSeriesViewSet, basename='public-series')

urlpatterns = [
    path('', include(router.urls)),
]
