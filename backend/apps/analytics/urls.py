"""
Analytics URLs
"""
from django.urls import path
from . import views

urlpatterns = [
    # Dashboard endpoints
    path('dashboard/visitor-count/', views.visitor_count_dashboard, name='visitor-count-dashboard'),
    
    # Detailed analytics
    path('page-views/by-date/', views.page_views_by_date, name='page-views-by-date'),
    path('page-breakdown/', views.page_breakdown, name='page-breakdown'),
    
    # Tracking
    path('track/', views.track_page_view, name='track-page-view'),
]
