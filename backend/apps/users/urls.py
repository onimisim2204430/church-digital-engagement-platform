"""
URL configuration for users app.

Authentication endpoints:
- /auth/register/ - User registration
- /auth/login/ - User login
- /auth/logout/ - User logout
- /auth/refresh/ - Token refresh
- /auth/me/ - Current user profile
- /auth/change-password/ - Change password

RBAC permission management endpoints:
- /admin/permissions/codes/          - List all permission codes + sub-role templates
- /admin/users/{id}/permissions/     - GET / PATCH permissions for a moderator
"""

from django.urls import path, include
from django.views.decorators.csrf import csrf_exempt
from rest_framework.routers import DefaultRouter
from .views import (
    CustomTokenRefreshView,
    SelfPermissionsView,
    UserRegistrationView,
    UserLoginView,
    GoogleLoginView,
    UserLogoutView,
    CurrentUserView,
    ChangePasswordView,
    ChangeEmailView,
    AdminUserViewSet,
    CsrfTokenView,
    PermissionCodeListView,
    ModeratorPermissionView,
)
from .admin_auth_views import AdminRegistrationView, AdminLoginView
from .email_verification_views import (
    InitiateEmailVerificationView,
    ResendEmailVerificationView,
    VerifyEmailView
)
from .password_reset_views import (
    PasswordResetRequestView,
    PasswordResetConfirmView,
)

app_name = 'users'

# Router for admin user management
router = DefaultRouter()
router.register(r'admin/users', AdminUserViewSet, basename='admin-user')

urlpatterns = [
    # Admin Authentication (CSRF-exempt, dedicated endpoints)
    path('admin-auth/register/', AdminRegistrationView.as_view(), name='admin-register'),
    path('admin-auth/login/', AdminLoginView.as_view(), name='admin-login'),
    
    # CSRF token endpoint
    path('auth/csrf/', CsrfTokenView.as_view(), name='csrf-token'),
    
    # Authentication endpoints
    path('auth/register/', UserRegistrationView.as_view(), name='register'),
    path('auth/login/', UserLoginView.as_view(), name='login'),
    path('auth/google/', GoogleLoginView.as_view(), name='google-login'),
    path('auth/logout/', UserLogoutView.as_view(), name='logout'),
    path('auth/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('auth/my-permissions/', SelfPermissionsView.as_view(), name='my-permissions'),
    
    # User profile endpoints
    path('auth/me/', CurrentUserView.as_view(), name='current-user'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('auth/change-email/', ChangeEmailView.as_view(), name='change-email'),
    
    # Password reset endpoints (unauthenticated)
    path('auth/password-reset/request/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('auth/password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),

    # Email verification endpoints - Testing without csrf_exempt wrapper
    path('auth/verify-email/initiate/', InitiateEmailVerificationView.as_view(), name='initiate-verification'),
    path('auth/verify-email/resend/', ResendEmailVerificationView.as_view(), name='resend-verification'),
    path('auth/verify-email/', VerifyEmailView.as_view(), name='verify-email'),  # PUBLIC GET endpoint, query: ?token=...
    
    # RBAC — Permission management (admin only)
    path('admin/permissions/codes/', PermissionCodeListView.as_view(), name='permission-codes'),
    path('admin/users/<uuid:user_id>/permissions/', ModeratorPermissionView.as_view(), name='moderator-permissions'),

    # Admin user management (router)
    path('', include(router.urls)),
]
