"""
Views for user authentication and management.

Endpoints:
- POST /api/v1/auth/register/ - User registration
- POST /api/v1/auth/login/ - User login
- POST /api/v1/auth/logout/ - User logout
- GET /api/v1/auth/me/ - Current user profile
- PATCH /api/v1/auth/me/ - Update user profile
- POST /api/v1/auth/change-password/ - Change password
"""

import threading

from rest_framework import status, generics, permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework_simplejwt.tokens import RefreshToken
import logging

from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from drf_spectacular.utils import extend_schema, OpenApiResponse
from django.utils import timezone
from django.conf import settings
from django.db import transaction

from .models import User, UserRole
from .permissions import IsAdmin
from .utils.permissions_cache import get_cached_permissions, set_cached_permissions
from apps.notifications.services import NotificationService
from apps.notifications.constants import NotificationPriority, NotificationType, SourceModule
from apps.email.services import EmailService
from apps.email.constants import EmailType

logger = logging.getLogger('admin_auth')


def _enqueue_member_update_alert(
    *,
    target_user: User,
    actor: User,
    notification_type: str,
    title: str,
    message: str,
    metadata: dict | None = None,
    template_slug: str = 'notification',
    email_context: dict | None = None,
    email_subject: str | None = None,
) -> None:
    """
    True fire-and-forget: spawns a tiny daemon thread so the HTTP response
    returns the instant the DB transaction commits — zero Redis/network
    latency added to the request.  The thread enqueues both Celery tasks
    (< 20 ms total) and exits.
    """
    # Capture primitives NOW (before the thread runs) — no ORM objects
    # are shared across threads to avoid cross-thread lazy-evaluation.
    _user_id   = str(getattr(target_user, 'id', ''))
    _user_email = target_user.email
    _user_name  = target_user.get_full_name()
    _notif_type = notification_type
    _title      = title
    _message    = message
    _payload    = (metadata or {}).copy()
    _payload.setdefault('changed_at', timezone.now().isoformat())
    if actor:
        _payload.setdefault('changed_by_id', str(getattr(actor, 'id', '')))
        _payload.setdefault('changed_by_email', getattr(actor, 'email', ''))
    _action_url  = getattr(settings, 'FRONTEND_MEMBER_DASHBOARD_URL', '') or ''
    _site_name   = getattr(settings, 'SITE_NAME', 'Church Platform')
    _email_type  = str(EmailType.NOTIFICATION)
    _template_slug = template_slug
    _email_subject = email_subject
    _extra_ctx = (email_context or {}).copy()

    def _run():
        # Notification — single Redis write via Celery .delay()
        try:
            NotificationService.notify_user_async(
                user=target_user,
                notification_type=_notif_type,
                title=_title,
                message=_message,
                metadata=_payload,
                priority=NotificationPriority.MEDIUM,
                source_module=SourceModule.ADMIN,
            )
            logger.info(
                '[NOTIFICATION] Queued role/permission notification via Celery',
                extra={'target_user_id': _user_id, 'type': _notif_type},
            )
        except Exception:
            logger.exception(
                'Failed to queue role/permission notification',
                extra={'target_user_id': _user_id, 'type': _notif_type},
            )

        # Email — single Redis write via Celery .delay()
        try:
            from apps.email.tasks import send_email_by_params_task
            ctx = {
                'user_name': _user_name,
                'notification_title': _title,
                'notification_body': _message,
                'action_label': 'Go to Dashboard',
                'action_url': _action_url,
                'site_name': _site_name,
            }
            if _email_subject:
                ctx['subject'] = _email_subject
            ctx.update(_extra_ctx)
            send_email_by_params_task.delay(
                to_email=_user_email,
                template_slug=_template_slug,
                context=ctx,
                email_type=_email_type,
                user_id=_user_id,
            )
            logger.info(
                '[EMAIL] Queued role/permission email via send_email_by_params_task',
                extra={'target_user_id': _user_id, 'to_email': _user_email},
            )
        except Exception:
            logger.exception(
                'Failed to queue role/permission email',
                extra={'target_user_id': _user_id, 'type': _notif_type},
            )

    threading.Thread(target=_run, daemon=True).start()  # returns in < 1 ms


def _build_token_for_user(user):
    """Create a RefreshToken with role+permissions baked into the access payload."""
    from rest_framework_simplejwt.tokens import RefreshToken as _Refresh
    refresh = _Refresh.for_user(user)
    perms = get_cached_permissions(str(user.id))
    refresh.access_token['role'] = user.role
    refresh.access_token['permissions'] = perms
    set_cached_permissions(str(user.id), perms)
    return refresh
from .serializers import (
    UserSerializer,
    UserRegistrationSerializer,
    UserLoginSerializer,
    GoogleLoginSerializer,
    TokenResponseSerializer,
    UserProfileUpdateSerializer,
    ChangePasswordSerializer,
    ChangeEmailSerializer,
)
from .services.google_oauth_service import (
    GoogleOAuthService,
    GoogleOAuthConfigurationError,
    GoogleTokenInvalidError,
    GoogleAudienceMismatchError,
    GoogleEmailNotVerifiedError,
    GoogleEmailConflictError,
)


class CustomTokenRefreshView(TokenRefreshView):
    """
    Replaces SimpleJWT's default token refresh view.

    On every access-token refresh we re-read the user's *current* role and
    permissions from Redis/DB and bake them into the new access token.
    """

    def post(self, request, *args, **kwargs):
        # Let the parent view validate the refresh token first
        response = super().post(request, *args, **kwargs)
        if response.status_code != 200:
            return response

        # Decode user_id from the *new* access token in the response
        # (NOT the incoming refresh token which may be rotated/blacklisted)
        try:
            from rest_framework_simplejwt.tokens import AccessToken as _AT
            new_access = _AT(response.data['access'])
            user_id = new_access['user_id']
            user = User.objects.get(pk=user_id)
        except Exception as exc:
            logger.warning(f"[TOKEN-REFRESH] Could not enrich token: {exc}")
            return response

        # Rebuild a fresh token with role+permissions baked in
        new_refresh = _build_token_for_user(user)
        response.data['access'] = str(new_refresh.access_token)
        if 'refresh' in response.data:
            response.data['refresh'] = str(new_refresh)
        logger.warning(f"[TOKEN-REFRESH] Enriched → {user.email} role={user.role} perms={get_cached_permissions(str(user.id))}")
        return response


class UserRegistrationView(generics.CreateAPIView):
    """User registration endpoint."""
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    
    @extend_schema(
        responses={201: TokenResponseSerializer, 400: OpenApiResponse(description='Validation errors')},
        tags=['Authentication']
    )
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        refresh = _build_token_for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh)
        }, status=status.HTTP_201_CREATED)


class UserLoginView(APIView):
    """User login endpoint."""
    permission_classes = [permissions.AllowAny]
    serializer_class = UserLoginSerializer
    
    @extend_schema(
        request=UserLoginSerializer,
        responses={200: TokenResponseSerializer, 400: OpenApiResponse(description='Invalid credentials')},
        tags=['Authentication']
    )
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        refresh = _build_token_for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh)
        }, status=status.HTTP_200_OK)


class GoogleLoginView(APIView):
    """Google OAuth login/signup endpoint using server-side ID token verification."""

    permission_classes = [permissions.AllowAny]
    serializer_class = GoogleLoginSerializer

    @extend_schema(
        request=GoogleLoginSerializer,
        responses={
            200: TokenResponseSerializer,
            201: TokenResponseSerializer,
            400: OpenApiResponse(description='Invalid token or request payload'),
            401: OpenApiResponse(description='Token audience mismatch'),
            409: OpenApiResponse(description='Email conflict with password account'),
            503: OpenApiResponse(description='Google OAuth not configured'),
        },
        tags=['Authentication']
    )
    def post(self, request):
        request_meta = {
            'origin': request.headers.get('Origin', ''),
            'referer': request.headers.get('Referer', ''),
            'user_agent': request.headers.get('User-Agent', ''),
            'content_type': request.content_type,
        }
        logger.info('[GOOGLE_AUTH_DEBUG] STAGE B1: /auth/google/ request received %s', request_meta)

        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        logger.info('[GOOGLE_AUTH_DEBUG] STAGE B2: request payload validated')

        service = GoogleOAuthService()
        raw_id_token = serializer.validated_data['id_token']
        logger.info(
            '[GOOGLE_AUTH_DEBUG] STAGE B3: id_token extracted token_length=%s',
            len(raw_id_token or ''),
        )

        try:
            profile = service.verify_id_token(raw_id_token)
            logger.info(
                '[GOOGLE_AUTH_DEBUG] STAGE B4: token verified email=%s sub_prefix=%s',
                profile.email,
                profile.sub[:8],
            )
            user, created = service.get_or_create_user(profile)
            logger.info(
                '[GOOGLE_AUTH_DEBUG] STAGE B5: user resolved user_id=%s created=%s role=%s',
                str(user.id),
                created,
                user.role,
            )
        except GoogleOAuthConfigurationError:
            logger.warning('[GOOGLE_AUTH_DEBUG] FAIL CODE=google_oauth_not_configured status=503')
            return Response(
                {'error': 'Google OAuth is not configured on the server', 'code': 'google_oauth_not_configured'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except GoogleAudienceMismatchError:
            logger.warning('[GOOGLE_AUTH_DEBUG] FAIL CODE=google_audience_mismatch status=401')
            return Response(
                {'error': 'Google token audience mismatch', 'code': 'google_audience_mismatch'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except GoogleEmailNotVerifiedError:
            logger.warning('[GOOGLE_AUTH_DEBUG] FAIL CODE=google_email_not_verified status=400')
            return Response(
                {'error': 'Google email is not verified', 'code': 'google_email_not_verified'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except GoogleEmailConflictError as exc:
            logger.warning('[GOOGLE_AUTH_DEBUG] FAIL CODE=google_email_conflict status=409 message=%s', str(exc))
            return Response(
                {'error': str(exc), 'code': 'google_email_conflict'},
                status=status.HTTP_409_CONFLICT,
            )
        except GoogleTokenInvalidError:
            logger.warning('[GOOGLE_AUTH_DEBUG] FAIL CODE=google_token_invalid status=400')
            return Response(
                {'error': 'Invalid or expired Google token', 'code': 'google_token_invalid'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception:
            logger.exception('[GOOGLE_AUTH_DEBUG] FAIL CODE=google_login_failed status=500 unexpected error')
            return Response(
                {'error': 'Unable to process Google sign-in right now', 'code': 'google_login_failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        refresh = _build_token_for_user(user)
        logger.info('[GOOGLE_AUTH_DEBUG] STAGE B6: JWT refresh/access generated user_id=%s', str(user.id))
        response_payload = {
            'user': UserSerializer(user, context={'request': request}).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }
        logger.info(
            '[GOOGLE_AUTH_DEBUG] STAGE B7: response sent status=%s',
            status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )
        return Response(response_payload, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class UserLogoutView(APIView):
    """User logout endpoint."""
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        request={'application/json': {'refresh': 'string'}},
        responses={205: OpenApiResponse(description='Successfully logged out'), 400: OpenApiResponse(description='Invalid token')},
        tags=['Authentication']
    )
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response({'error': 'Refresh token is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            token = RefreshToken(refresh_token)
            token.blacklist()
            
            return Response({'message': 'Successfully logged out'}, status=status.HTTP_205_RESET_CONTENT)
        except Exception:
            return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)


class SelfPermissionsView(APIView):
    """
    GET /api/v1/auth/my-permissions/
    Returns the current authenticated user's own role + permissions from the DB.
    Used by the frontend to resolve permissions without relying on JWT claims.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        perms = get_cached_permissions(str(user.id))
        return Response({'role': user.role, 'permissions': perms})


class CurrentUserView(generics.RetrieveUpdateAPIView):
    """Get or update current user profile."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return UserSerializer
        return UserProfileUpdateSerializer
    
    @extend_schema(responses={200: UserSerializer}, tags=['User Profile'])
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    @extend_schema(request=UserProfileUpdateSerializer, responses={200: UserSerializer}, tags=['User Profile'])
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)


class ChangeEmailView(APIView):
    """
    Change the authenticated user's email address.
    Requires the current password to confirm identity.
    After a successful change, email_verified is reset to False —
    the user should re-verify via the existing email-verification flow.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangeEmailSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                'message': 'Email updated successfully. Please verify your new email address.',
                'email': user.email,
                'email_verified': user.email_verified,
            },
            status=status.HTTP_200_OK,
        )


class ChangePasswordView(APIView):
    """
    DISABLED – password changes must go through the email-verification reset flow.
    Use POST /api/v1/auth/password-reset/request/ and /confirm/ instead.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        return Response(
            {
                'error': (
                    'Direct password changes are not allowed. '
                    'Please use the email verification flow: '
                    'POST /api/v1/auth/password-reset/request/ to receive a code, '
                    'then POST /api/v1/auth/password-reset/confirm/ to set your new password.'
                )
            },
            status=status.HTTP_403_FORBIDDEN,
        )


# Admin User Management Views

class AdminUserViewSet(viewsets.ModelViewSet):
    """
    Admin viewset for managing all users with comprehensive features:
    - User list with filtering, search, and pagination
    - User detail view with activity summary
    - Role management with safety checks
    - Suspension management with reasons and expiry
    - Email subscription control
    - Complete audit logging
    """
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = User.objects.all()
    http_method_names = ['get', 'patch', 'post']  # No DELETE - accounts are never deleted
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            from .serializers import AdminUserListSerializer
            return AdminUserListSerializer
        elif self.action == 'retrieve':
            from .serializers import AdminUserDetailSerializer
            return AdminUserDetailSerializer
        elif self.action == 'change_role':
            from .serializers import ChangeRoleSerializer
            return ChangeRoleSerializer
        elif self.action == 'suspend':
            from .serializers import SuspendUserSerializer
            return SuspendUserSerializer
        elif self.action == 'update_email_subscription':
            from .serializers import UpdateEmailSubscriptionSerializer
            return UpdateEmailSubscriptionSerializer
        return UserSerializer
    
    def get_queryset(self):
        """
        Get filtered queryset with all user management filters.
        CRITICAL: Excludes ADMIN users - they are system-level and must not appear in user management.
        """
        # EXCLUDE ADMIN USERS - they are protected system accounts
        queryset = User.objects.exclude(role=UserRole.ADMIN).select_related('suspended_by', 'mod_permissions')
        
        # Filter by role (only MEMBER and MODERATOR are manageable)
        role = self.request.query_params.get('role')
        if role and role in [UserRole.MEMBER, UserRole.MODERATOR]:
            queryset = queryset.filter(role=role)
        
        # Filter by suspended status (is_active is always True except when suspended)
        is_suspended = self.request.query_params.get('is_suspended')
        if is_suspended is not None:
            queryset = queryset.filter(is_suspended=is_suspended.lower() == 'true')
        
        # Filter by email verified
        email_verified = self.request.query_params.get('email_verified')
        if email_verified is not None:
            queryset = queryset.filter(email_verified=email_verified.lower() == 'true')
        
        # Filter by email subscription
        email_subscribed = self.request.query_params.get('email_subscribed')
        if email_subscribed is not None:
            queryset = queryset.filter(email_subscribed=email_subscribed.lower() == 'true')
        
        # Search by email or name
        search = self.request.query_params.get('search')
        if search:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )
        
        # Sort by created_at (date_joined) by default
        sort_by = self.request.query_params.get('sort_by', '-date_joined')
        if sort_by in ['email', '-email', 'date_joined', '-date_joined', 'last_login', '-last_login', 'role', '-role']:
            queryset = queryset.order_by(sort_by)
        else:
            queryset = queryset.order_by('-date_joined')
        
        return queryset
    
    def retrieve(self, request, *args, **kwargs):
        """Get user detail with activity summary."""
        user = self.get_object()
        serializer = self.get_serializer(user)
        
        # Get activity stats
        from apps.content.models import Post
        from apps.interactions.models import Comment, Reaction
        
        activity_data = {
            'posts_count': Post.objects.filter(author=user).count(),
            'comments_count': Comment.objects.filter(user=user).count(),  # Comment uses 'user' field
            'reactions_count': Reaction.objects.filter(user=user).count(),
        }
        
        response_data = serializer.data
        response_data['activity'] = activity_data
        
        return Response(response_data)
    
    def partial_update(self, request, *args, **kwargs):
        """
        Atomic update of user status and/or role.
        Handles both is_suspended and role changes in a single transaction.
        
        Expected payload:
        {
            "is_suspended": true/false,
            "role": "MEMBER" or "MODERATOR",
            "reason": "optional suspension reason"
        }
        """
        from apps.moderation.models import AuditLog
        
        user = self.get_object()
        old_role = user.role
        old_suspended = user.is_suspended
        role_changed = False
        
        # Extract fields
        new_suspended = request.data.get('is_suspended')
        new_role = request.data.get('role')
        reason = request.data.get('reason', '')
        
        # Validation
        if new_role and new_role not in [UserRole.MEMBER, UserRole.MODERATOR]:
            return Response(
                {'error': 'Invalid role. Only MEMBER and MODERATOR are allowed.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Atomic update — DB writes only, no side-effects outside the transaction
        changes = []
        with transaction.atomic():
            # Update role if changed
            if new_role and new_role != old_role:
                role_changed = True
                user.role = new_role
                changes.append(f'Role: {old_role} → {new_role}')
                
                # Create audit log for role change
                AuditLog.objects.create(
                    user=request.user,
                    action_type='ROLE_CHANGE',
                    content_object=user,
                    description=f'Changed {user.email} role from {old_role} to {new_role}. Reason: {reason or "No reason provided"}'
                )
            
            # Update suspension status if changed
            if new_suspended is not None and new_suspended != old_suspended:
                user.is_suspended = new_suspended
                
                if new_suspended:
                    # Suspending user
                    user.suspended_by = request.user
                    user.suspended_at = timezone.now()
                    user.suspension_reason = reason or 'Suspended by admin'
                    changes.append(f'Status: ACTIVE → SUSPENDED')
                    
                    AuditLog.objects.create(
                        user=request.user,
                        action_type='SUSPEND',
                        content_object=user,
                        description=f'Suspended {user.email}. Reason: {user.suspension_reason}'
                    )
                else:
                    # Unsuspending user
                    user.suspended_by = None
                    user.suspended_at = None
                    user.suspension_reason = None
                    user.suspension_expires_at = None
                    changes.append(f'Status: SUSPENDED → ACTIVE')
                    
                    AuditLog.objects.create(
                        user=request.user,
                        action_type='REACTIVATE',
                        content_object=user,
                        description=f'Unsuspended {user.email}'
                    )
            
            if changes:
                user.save()

        # Fire notifications/email AFTER the transaction has committed — fire-and-forget via Celery
        if changes and role_changed:
            actor_name = request.user.get_full_name() or request.user.email
            reason_text = reason or ''
            msg = f'Your role was changed from {old_role} to {new_role} by {actor_name}.'
            if reason_text:
                msg = f'{msg} Reason: {reason_text}'

            _enqueue_member_update_alert(
                target_user=user,
                actor=request.user,
                notification_type=NotificationType.ROLE_UPDATED,
                title='Your account role was updated',
                message=msg,
                metadata={
                    'old_role': old_role,
                    'new_role': new_role,
                    'reason': reason_text,
                },
            )

        if changes:
            return Response({
                'message': 'User updated successfully',
                'changes': changes
            })
        return Response({'message': 'No changes made'})
    
    @action(detail=True, methods=['patch'])
    def change_role(self, request, pk=None):
        """
        Change user role between MEMBER and MODERATOR only.
        - Only MEMBER ↔ MODERATOR transitions allowed
        - Cannot change ADMIN users (they're excluded from queryset)
        - Requires confirmation via reason parameter
        - All changes are logged
        """
        user = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        new_role = serializer.validated_data['role']
        reason = serializer.validated_data.get('reason', '')
        
        # Validate: Only MEMBER and MODERATOR roles are allowed
        if new_role not in [UserRole.MEMBER, UserRole.MODERATOR]:
            return Response(
                {'error': 'Only MEMBER and MODERATOR roles are allowed in user management'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Safety check: Prevent changing own role if you're an admin viewing this somehow
        if user == request.user:
            return Response(
                {'error': 'Cannot change your own role'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_role = user.role
        role_changed = old_role != new_role

        with transaction.atomic():
            user.role = new_role
            user.save()

        # Fire notification/email after the transaction commits — fire-and-forget via Celery
        if role_changed:
            actor_name = request.user.get_full_name() or request.user.email
            reason_text = reason or ''
            msg = f'Your role was changed from {old_role} to {new_role} by {actor_name}.'
            if reason_text:
                msg = f'{msg} Reason: {reason_text}'

            _enqueue_member_update_alert(
                target_user=user,
                actor=request.user,
                notification_type=NotificationType.ROLE_UPDATED,
                title='Your account role was updated',
                message=msg,
                metadata={
                    'old_role': old_role,
                    'new_role': new_role,
                    'reason': reason_text,
                },
            )
        
        # Create audit log
        from apps.content.views import create_audit_log
        from apps.moderation.models import ActionType
        create_audit_log(
            user=request.user,
            action_type=ActionType.ROLE_CHANGE,
            description=f"Changed {user.email} role from {old_role} to {new_role}. Reason: {reason or 'Not provided'}",
            content_object=user,
            request=request
        )
        
        from .serializers import AdminUserDetailSerializer
        return Response({
            'message': 'Role changed successfully',
            'user': AdminUserDetailSerializer(user).data
        })
    
    @action(detail=True, methods=['patch'])
    def suspend(self, request, pk=None):
        """
        Suspend a user account (MEMBER or MODERATOR only).
        - Cannot suspend yourself
        - Requires suspension reason
        - Sets is_suspended=True (account remains is_active=True)
        """
        user = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        reason = serializer.validated_data['reason']
        expires_at = serializer.validated_data.get('expires_at')
        
        # Safety check: Cannot suspend yourself
        if user == request.user:
            return Response(
                {'error': 'Cannot suspend your own account'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Apply suspension using model method
        user.suspend(
            suspended_by=request.user,
            reason=reason,
            expires_at=expires_at
        )
        
        # Create audit log
        from apps.content.views import create_audit_log
        from apps.moderation.models import ActionType
        expiry_text = f" (expires: {expires_at})" if expires_at else ""
        create_audit_log(
            user=request.user,
            action_type=ActionType.SUSPEND,
            description=f"Suspended user: {user.email}. Reason: {reason}{expiry_text}",
            content_object=user,
            request=request
        )
        
        from .serializers import AdminUserDetailSerializer
        return Response({
            'message': 'User suspended successfully',
            'user': AdminUserDetailSerializer(user).data
        })
    
    @action(detail=True, methods=['patch'])
    def unsuspend(self, request, pk=None):
        """Reactivate a suspended user account."""
        user = self.get_object()
        
        if not user.is_suspended:
            return Response(
                {'error': 'User is not currently suspended'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Remove suspension using model method
        user.unsuspend()
        
        # Create audit log
        from apps.content.views import create_audit_log
        from apps.moderation.models import ActionType
        create_audit_log(
            user=request.user,
            action_type=ActionType.REACTIVATE,
            description=f"Removed suspension from user: {user.email}",
            content_object=user,
            request=request
        )
        
        from .serializers import AdminUserDetailSerializer
        return Response({
            'message': 'User unsuspended successfully',
            'user': AdminUserDetailSerializer(user).data
        })
    
    @action(detail=True, methods=['patch'])
    def update_email_subscription(self, request, pk=None):
        """Update user's email subscription preference."""
        user = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email_subscribed = serializer.validated_data['email_subscribed']
        user.email_subscribed = email_subscribed
        user.save()
        
        # Create audit log
        from apps.content.views import create_audit_log
        from apps.moderation.models import ActionType
        action_text = 'subscribed to' if email_subscribed else 'unsubscribed from'
        create_audit_log(
            user=request.user,
            action_type=ActionType.OTHER,
            description=f"User {user.email} {action_text} email campaigns",
            content_object=user,
            request=request
        )
        
        from .serializers import AdminUserDetailSerializer
        return Response({
            'message': f'Email subscription updated successfully',
            'user': AdminUserDetailSerializer(user).data
        })
    
    @action(detail=False, methods=['post'])
    def bulk_export(self, request):
        """Export selected users to CSV."""
        user_ids = request.data.get('user_ids', [])
        
        if not user_ids:
            return Response(
                {'error': 'No users selected'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        users = User.objects.filter(id__in=user_ids)
        
        # Create CSV response
        import csv
        from django.http import HttpResponse
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="users_export.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Email', 'Name', 'Role', 'Status', 'Email Verified', 'Joined', 'Last Login'])
        
        for user in users:
            writer.writerow([
                user.email,
                user.get_full_name(),
                user.role,
                user.account_status,
                'Yes' if user.email_verified else 'No',
                user.date_joined.strftime('%Y-%m-%d'),
                user.last_login.strftime('%Y-%m-%d') if user.last_login else 'Never'
            ])
        
        # Create audit log
        from apps.content.views import create_audit_log
        from apps.moderation.models import ActionType
        create_audit_log(
            user=request.user,
            action_type=ActionType.OTHER,
            description=f"Exported {len(users)} users to CSV",
            content_object=None,
            request=request
        )
        
        return response


class CsrfTokenView(APIView):
    """
    CSRF token endpoint for cross-origin requests.
    Returns a CSRF cookie that can be used for subsequent requests.
    """
    permission_classes = [permissions.AllowAny]
    
    @extend_schema(
        responses={200: OpenApiResponse(description='CSRF token set in cookie')},
        tags=['Authentication']
    )
    def get(self, request):
        """Endpoint to fetch CSRF token."""
        from django.middleware.csrf import get_token
        csrf_token = get_token(request)
        return Response({'detail': 'CSRF cookie set', 'csrfToken': csrf_token}, status=200)


# ==============================================================================
# RBAC — Moderator Permission Management
# ==============================================================================

class PermissionCodeListView(APIView):
    """
    Return a structured list of all available module permission codes.

    ``GET /api/v1/admin/permissions/codes/``

    Response shape::

        {
          "codes": {
            "Finance": [
              {"code": "fin.hub", "label": "Financial Hub", "description": "...", "icon": "..."},
              ...
            ],
            ...
          },
          "templates": {
            "finance": {"label": "Finance Moderator", "codes": [...], ...},
            ...
          }
        }

    Access: admin only (ADMIN role required).
    """
    permission_classes = [IsAdmin]

    @extend_schema(
        responses={200: OpenApiResponse(description='Permission codes and sub-role templates')},
        tags=['Admin Permissions'],
    )
    def get(self, request):
        from apps.users.permission_codes import PERMISSION_CODES, SUB_ROLE_TEMPLATES
        from apps.users.models import ModeratorPermission
        from django.db.models import Count
        from apps.users.models import ModeratorPermission

        # Group codes by category
        grouped: dict[str, list] = {}
        for code, meta in PERMISSION_CODES.items():
            cat = meta['category']
            grouped.setdefault(cat, []).append({
                'code': code,
                'label': meta['label'],
                'description': meta['description'],
                'icon': meta['icon'],
            })

        # Count how many moderators are assigned each template (matched by sub_role_label)
        label_counts: dict[str, int] = {
            row['sub_role_label']: row['cnt']
            for row in ModeratorPermission.objects
                .exclude(sub_role_label='')
                .values('sub_role_label')
                .annotate(cnt=Count('id'))
        }

        templates_with_counts = {
            key: {
                **tmpl,
                'user_count': label_counts.get(tmpl['label'], 0),
            }
            for key, tmpl in SUB_ROLE_TEMPLATES.items()
        }

        return Response({
            'codes': grouped,
            'templates': templates_with_counts,
        })


class ModeratorPermissionView(APIView):
    """
    GET / PATCH the module permissions for a specific moderator user.

    ``GET  /api/v1/admin/users/{user_id}/permissions/``
    ``PATCH /api/v1/admin/users/{user_id}/permissions/``

    PATCH body::

        {
          "permissions": ["fin.hub", "content.posts"],
          "sub_role_label": "Finance Moderator"   // optional
        }

    Side-effects on PATCH:
    - Creates or updates the ``ModeratorPermission`` row
    - Invalidates the Redis permissions cache for the user
    - Returns the updated permissions

    Access: admin only (ADMIN role required).
    """
    permission_classes = [IsAdmin]

    def _get_user_or_404(self, user_id):
        try:
            return User.objects.get(id=user_id)
        except (User.DoesNotExist, ValueError):
            return None

    @extend_schema(
        responses={200: OpenApiResponse(description='Current permissions for moderator')},
        tags=['Admin Permissions'],
    )
    def get(self, request, user_id):
        user = self._get_user_or_404(user_id)
        if user is None:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        from apps.users.models import ModeratorPermission
        mp = ModeratorPermission.objects.filter(user=user).first()

        return Response({
            'user_id': str(user.id),
            'email': user.email,
            'role': user.role,
            'permissions': mp.permissions if mp else [],
            'sub_role_label': mp.sub_role_label if mp else '',
            'updated_at': mp.updated_at.isoformat() if mp else None,
        })

    @extend_schema(
        request={'application/json': {'type': 'object'}},
        responses={200: OpenApiResponse(description='Updated permissions')},
        tags=['Admin Permissions'],
    )
    def patch(self, request, user_id):
        user = self._get_user_or_404(user_id)
        if user is None:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if user.role != 'MODERATOR':
            return Response(
                {'error': 'Module permissions can only be set for MODERATOR users'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from .serializers import ModeratorPermissionSerializer
        serializer = ModeratorPermissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from apps.users.models import ModeratorPermission
        from apps.users.utils.permissions_cache import invalidate_permissions_cache, set_cached_permissions

        mp, _ = ModeratorPermission.objects.get_or_create(user=user)
        old_permissions = list(mp.permissions)
        old_sub_role_label = mp.sub_role_label or ''

        new_permissions = serializer.validated_data['permissions']

        # DB write in atomic block — cache update and alert happen after commit
        with transaction.atomic():
            if 'sub_role_label' in serializer.validated_data:
                mp.sub_role_label = serializer.validated_data['sub_role_label']
            mp.permissions = new_permissions
            mp.updated_by = request.user
            mp.save()  # post_save signal also calls invalidate_permissions_cache

        # Cache update outside atomic — non-critical, best-effort
        set_cached_permissions(str(user.id), mp.permissions)

        perms_added = sorted(set(new_permissions) - set(old_permissions))
        perms_removed = sorted(set(old_permissions) - set(new_permissions))
        label_changed = (old_sub_role_label or '') != (mp.sub_role_label or '')

        if perms_added or perms_removed or label_changed:
            from apps.users.permission_codes import PERMISSION_CODES as _PC

            def _perm_info(code):
                info = _PC.get(code, {})
                return {
                    'label': info.get('label', code),
                    'description': info.get('description', ''),
                    'category': info.get('category', ''),
                }

            perms_added_labels = [_perm_info(c) for c in perms_added]
            perms_removed_labels = [_perm_info(c) for c in perms_removed]

            # Build a clean in-app notification message using friendly names
            added_names = ', '.join(p['label'] for p in perms_added_labels)
            removed_names = ', '.join(p['label'] for p in perms_removed_labels)
            msg_parts = ['Your moderator access was updated by the Administrator.']
            if added_names:
                msg_parts.append(f'Added: {added_names}.')
            if removed_names:
                msg_parts.append(f'Removed: {removed_names}.')
            if label_changed:
                old_lbl = old_sub_role_label or 'None'
                new_lbl = mp.sub_role_label or 'None'
                msg_parts.append(f'Role title changed: {old_lbl} → {new_lbl}.')
            message = ' '.join(msg_parts)

            _site_name = getattr(settings, 'SITE_NAME', 'Church Platform')
            _enqueue_member_update_alert(
                target_user=user,
                actor=request.user,
                notification_type=NotificationType.PERMISSIONS_UPDATED,
                title='Your moderator access was updated',
                message=message,
                metadata={
                    'old_permissions': old_permissions,
                    'new_permissions': mp.permissions,
                    'permissions_added': perms_added,
                    'permissions_removed': perms_removed,
                    'old_sub_role_label': old_sub_role_label,
                    'new_sub_role_label': mp.sub_role_label,
                },
                template_slug='permissions_updated',
                email_subject=f'Your moderator access was updated — {_site_name}',
                email_context={
                    'permissions_added': perms_added_labels,
                    'permissions_removed': perms_removed_labels,
                    'sub_role_changed': label_changed,
                    'new_sub_role': mp.sub_role_label or '',
                    'old_sub_role': old_sub_role_label or '',
                },
            )

        return Response({
            'message': 'Permissions updated successfully',
            'user_id': str(user.id),
            'permissions': mp.permissions,
            'sub_role_label': mp.sub_role_label,
        })
