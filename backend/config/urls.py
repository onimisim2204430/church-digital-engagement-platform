"""
URL configuration for Church Digital Engagement Platform.
API versioning structure:
- /api/v1/auth/ - Authentication endpoints (login, register, refresh)
- /api/v1/users/ - User management endpoints
- /api/v1/content/ - Content management endpoints
- /api/v1/interactions/ - User interaction endpoints
- /api/v1/email/ - Email campaign endpoints
- /api/v1/moderation/ - Content moderation endpoints
- /api/v1/docs/ - API documentation (Swagger/ReDoc)
Frontend:
- / - React application (all non-API routes handled by React Router)
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from .views import ReactAppView
from apps.users.test_views import TestVerificationView  # Senior Engineer debug endpoint

urlpatterns = [
    # Django Admin (moved to /django-admin/ to avoid conflict with React /admin/ routes)
    path('django-admin/', admin.site.urls),

    # DEBUG: Minimal test endpoint to isolate 403 issue
    path('api/test-verify/', TestVerificationView.as_view(), name='test-verify'),

    # Payouts endpoints
    path('api/', include('apps.payouts.urls')),

    # API v1 endpoints
    path('api/v1/', include([
        # Authentication and user management
        path('', include('apps.users.urls')),

        # Public endpoints (no auth required)
        path('public/', include('apps.content.public_urls')),
        path('public/', include('apps.series.public_urls')),

        # Comments (public read, authenticated write)
        path('', include('apps.interactions.comment_urls')),

        # Admin endpoints
        path('admin/content/', include('apps.content.urls')),
        path('admin/interactions/', include('apps.interactions.urls')),
        path('admin/email/', include('apps.email_campaigns.urls')),
        path('admin/moderation/', include('apps.moderation.urls')),
        path('admin/series/', include('apps.series.urls')),

        # Analytics endpoints (visitor tracking, dashboard metrics)
        path('analytics/', include('apps.analytics.urls')),

        # Payments endpoints
        path('payments/', include('apps.payments.urls')),

        # Payouts endpoints (mirrored under /api/v1 for frontend baseURL compatibility)
        path('', include('apps.payouts.urls')),
        
        # Giving/Seed catalog endpoints
        path('giving-items/', include('apps.giving.urls')),

        # Notifications endpoints
        path('notifications/', include('apps.notifications.urls')),

        # Contact form (public submit + admin inbox)
        path('contact/', include('apps.contact.urls')),
    ])),

     # Bible Module (offline-first, cached)
     path('api/bible/', include('apps.bible.urls')),

    # API Documentation
    path('api/v1/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/v1/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/v1/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Serve React application for all other routes (must be last)
# Excludes only api/, django-admin/, static/, media/ — React handles /admin/* routes
urlpatterns += [
    re_path(r'^(?!api/|django-admin/|static/|media/).*$', ReactAppView.as_view(), name='react-app'),
]