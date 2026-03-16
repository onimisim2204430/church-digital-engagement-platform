"""
Analytics API Views
Dashboard metrics and visitor tracking endpoints
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils import timezone
from django.db.models import Count, Q
from datetime import timedelta

from .models import PageView


@api_view(['GET'])
@permission_classes([AllowAny])
def visitor_count_dashboard(request):
    """
    Get total visitor count for dashboard
    Returns total unique visitors (all time) and today's visitors
    """
    try:
        # All-time unique visitors (by device fingerprint)
        total_unique_visitors = PageView.objects.values('device_fingerprint').distinct().count()
        
        # Today's visitors
        today = timezone.now().date()
        today_visitors = PageView.objects.filter(
            timestamp__date=today
        ).values('device_fingerprint').distinct().count()
        
        # Total page views (all time)
        total_page_views = PageView.objects.count()
        
        # Today's page views
        today_page_views = PageView.objects.filter(
            timestamp__date=today
        ).count()
        
        return Response({
            'total_visits': total_unique_visitors,  # Frontend expects 'total_visits'
            'unique_count': total_unique_visitors,
            'today_visitors': today_visitors,
            'total_page_views': total_page_views,
            'today_page_views': today_page_views,
        })
    except Exception as e:
        return Response({
            'error': str(e),
            'total_visits': 0,
            'unique_count': 0,
            'today_visitors': 0,
            'total_page_views': 0,
            'today_page_views': 0,
        })


@api_view(['GET'])
@permission_classes([AllowAny])
def page_views_by_date(request):
    """Get page views grouped by date for the last N days (default: 30)"""
    days = int(request.query_params.get('days', 30))
    end_date = timezone.now().date()
    start_date = end_date - timedelta(days=days)
    
    try:
        page_views = PageView.objects.filter(
            timestamp__date__gte=start_date,
            timestamp__date__lte=end_date
        ).extra(
            select={'date': 'CAST(timestamp AS DATE)'}
        ).values('date').annotate(
            views=Count('id'),
            unique_visitors=Count('device_fingerprint', distinct=True)
        ).order_by('date')
        
        return Response({
            'period': f'{days} days',
            'data': list(page_views)
        })
    except Exception as e:
        return Response({
            'error': str(e),
            'period': f'{days} days',
            'data': []
        })


@api_view(['GET'])
@permission_classes([AllowAny])
def page_breakdown(request):
    """Get page views breakdown by page type"""
    try:
        breakdown = PageView.objects.values('page').annotate(
            views=Count('id'),
            unique_visitors=Count('device_fingerprint', distinct=True)
        ).order_by('-views')
        
        return Response({
            'breakdown': list(breakdown)
        })
    except Exception as e:
        return Response({
            'error': str(e),
            'breakdown': []
        })


@api_view(['POST'])
@permission_classes([AllowAny])
def track_page_view(request):
    """
    Track a page view from the public site
    Data: {
        'page': 'home|posts|series|devotional|give|other',
        'user_agent': browser user agent,
        'session_id': optional session ID
    }
    """
    try:
        page = request.data.get('page', 'other')
        user_agent = request.data.get('user_agent', '')
        session_id = request.data.get('session_id', '')
        
        # Get client IP
        ip_address = get_client_ip(request)
        
        # Get authenticated user if available
        user = request.user if request.user.is_authenticated else None
        
        # Create page view record
        PageView.objects.create(
            page=page,
            ip_address=ip_address,
            user_agent=user_agent,
            session_id=session_id,
            user=user,
        )
        
        return Response({
            'success': True,
            'message': 'Page view tracked'
        })
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        })


def get_client_ip(request):
    """Extract client IP from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip
