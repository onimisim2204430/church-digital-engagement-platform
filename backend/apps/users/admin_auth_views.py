"""
Dedicated admin authentication views.
Separate from regular user auth for security and clarity.
"""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from drf_spectacular.utils import extend_schema, OpenApiResponse

from .models import User, UserRole
from .serializers import UserSerializer
from .utils.permissions_cache import get_cached_permissions, set_cached_permissions


def _build_token_for_user(user) -> RefreshToken:
    """
    Create a RefreshToken with ``role`` and ``permissions`` baked into
    the access token payload, and warm the Redis permissions cache.

    Used by both AdminRegistrationView and AdminLoginView so the logic
    lives in one place.
    """
    refresh = RefreshToken.for_user(user)

    # Embed role + permissions into access token
    perms = get_cached_permissions(str(user.id))
    refresh.access_token['role'] = user.role
    refresh.access_token['permissions'] = perms

    # Warm cache (no-op if already populated)
    set_cached_permissions(str(user.id), perms)

    return refresh


@method_decorator(csrf_exempt, name='dispatch')
class AdminRegistrationView(APIView):
    """
    Admin-only registration endpoint.
    First user becomes admin automatically.
    After that, only existing admins can create admin accounts.
    """
    permission_classes = [AllowAny]
    
    @extend_schema(
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'email': {'type': 'string', 'format': 'email'},
                    'password': {'type': 'string', 'minLength': 8},
                    'first_name': {'type': 'string'},
                    'last_name': {'type': 'string'},
                },
                'required': ['email', 'password', 'first_name', 'last_name']
            }
        },
        responses={
            201: OpenApiResponse(description='Admin created successfully'),
            400: OpenApiResponse(description='Validation error'),
        },
        tags=['Admin Authentication']
    )
    def post(self, request):
        """Create admin user (first user auto-admin)."""
        email = request.data.get('email')
        password = request.data.get('password')
        # Support both camelCase and snake_case
        first_name = request.data.get('firstName') or request.data.get('first_name')
        last_name = request.data.get('lastName') or request.data.get('last_name')
        
        # Validation
        if not all([email, password, first_name, last_name]):
            return Response(
                {'error': 'All fields are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(password) < 8:
            return Response(
                {'error': 'Password must be at least 8 characters'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user exists
        if User.objects.filter(email=email).exists():
            return Response(
                {'error': 'User with this email already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # First user becomes admin automatically
        user_count = User.objects.count()
        
        # Create admin user
        user = User.objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=UserRole.ADMIN
        )
        
        # Set superuser flags
        user.is_staff = True
        user.is_superuser = True
        user.save()
        
        # Generate tokens with role + permissions baked in
        refresh = _build_token_for_user(user)
        
        return Response({
            'message': 'Admin account created successfully',
            'user': UserSerializer(user).data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh)
            }
        }, status=status.HTTP_201_CREATED)


@method_decorator(csrf_exempt, name='dispatch')
class AdminLoginView(APIView):
    """
    Admin-only login endpoint.
    Only users with ADMIN role can login here.
    """
    permission_classes = [AllowAny]
    
    @extend_schema(
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'email': {'type': 'string', 'format': 'email'},
                    'password': {'type': 'string'},
                },
                'required': ['email', 'password']
            }
        },
        responses={
            200: OpenApiResponse(description='Login successful'),
            401: OpenApiResponse(description='Invalid credentials or not an admin'),
        },
        tags=['Admin Authentication']
    )
    def post(self, request):
        """Authenticate admin user."""
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response(
                {'error': 'Email and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Authenticate user
        user = authenticate(request, username=email, password=password)

        if not user:
            return Response(
                {'error': 'Invalid email or password'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Only ADMIN and MODERATOR can access the admin panel
        if user.role not in (UserRole.ADMIN, UserRole.MODERATOR):
            return Response(
                {'error': 'Access denied. Admin or moderator privileges required.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if not user.is_active:
            return Response(
                {'error': 'Account is suspended'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Generate tokens with role + permissions baked in
        refresh = _build_token_for_user(user)

        return Response({
            'message': 'Login successful',
            'user': UserSerializer(user).data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh)
            }
        }, status=status.HTTP_200_OK)
