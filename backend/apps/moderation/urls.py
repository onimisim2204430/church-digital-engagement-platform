"""
Moderation App URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AdminAuditLogViewSet, AdminReportViewSet

app_name = 'moderation'

router = DefaultRouter()
router.register(r'audit-logs', AdminAuditLogViewSet, basename='admin-audit-log')
router.register(r'reports', AdminReportViewSet, basename='admin-report')

urlpatterns = [
    path('', include(router.urls)),
]
