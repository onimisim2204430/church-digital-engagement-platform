"""
Contact App URLs
"""
from django.urls import path
from .views import (
    PublicContactSubmitView,
    AdminContactInboxView,
    AdminContactMessageDetailView,
    AdminContactReplyView,
    AdminContactStatsView,
)

app_name = 'contact'

urlpatterns = [
    # Public submission endpoint (no auth required)
    path('submit/', PublicContactSubmitView.as_view(), name='public-submit'),

    # Admin endpoints
    path('messages/', AdminContactInboxView.as_view(), name='admin-inbox'),
    path('messages/<uuid:id>/', AdminContactMessageDetailView.as_view(), name='admin-detail'),
    path('messages/<uuid:id>/reply/', AdminContactReplyView.as_view(), name='admin-reply'),
    path('stats/', AdminContactStatsView.as_view(), name='admin-stats'),
]
