"""
Email Campaigns App URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AdminEmailCampaignViewSet, AdminEmailSubscriptionViewSet

app_name = 'email_campaigns'

router = DefaultRouter()
router.register(r'campaigns', AdminEmailCampaignViewSet, basename='admin-email-campaign')
router.register(r'subscriptions', AdminEmailSubscriptionViewSet, basename='admin-email-subscription')

urlpatterns = [
    path('', include(router.urls)),
]
