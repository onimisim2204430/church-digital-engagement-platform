"""URL routing for giving items API."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GivingItemViewSet

app_name = 'giving'

router = DefaultRouter()
router.register(r'', GivingItemViewSet, basename='giving-item')

urlpatterns = [
    path('', include(router.urls)),
]
