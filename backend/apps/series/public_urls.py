"""
Series Public URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .public_views import PublicSeriesViewSet
from .views import (
    PublicSeriesSubscriptionView,
    VerifySeriesSubscriptionView,
    UnsubscribeSeriesSubscriptionView,
    MemberRecentSermonsView,
)

app_name = 'series-public'

router = DefaultRouter()
router.register(r'series', PublicSeriesViewSet, basename='public-series')

urlpatterns = [
    path('series/subscriptions/', PublicSeriesSubscriptionView.as_view(), name='series-subscriptions-create'),
    path('series/subscriptions/verify/', VerifySeriesSubscriptionView.as_view(), name='series-subscriptions-verify'),
    path('series/subscriptions/unsubscribe/', UnsubscribeSeriesSubscriptionView.as_view(), name='series-subscriptions-unsubscribe'),
    path('series/member/recent-sermons/', MemberRecentSermonsView.as_view(), name='member-recent-sermons'),
    path('', include(router.urls)),
]
