"""
Series App URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AdminSeriesViewSet

app_name = 'series'

router = DefaultRouter()
router.register(r'', AdminSeriesViewSet, basename='admin-series')

urlpatterns = [
    path('', include(router.urls)),
]
