"""
Interactions App URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AdminCommentViewSet, AdminQuestionViewSet

app_name = 'interactions'

router = DefaultRouter()
router.register(r'comments', AdminCommentViewSet, basename='admin-comment')
router.register(r'questions', AdminQuestionViewSet, basename='admin-question')

urlpatterns = [
    path('', include(router.urls)),
]
