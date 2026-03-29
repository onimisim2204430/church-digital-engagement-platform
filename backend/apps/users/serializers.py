"""
Serializers for User authentication and management.

These serializers handle:
- User registration
- User login
- User profile retrieval and updates
- JWT token responses
- Custom JWT token pair with role + permissions baked in
"""

from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, UserRole


def resolve_profile_picture_url(user: User, request=None):
    """Return a valid profile picture URL, preferring uploaded image when file exists."""
    if user.profile_picture:
        try:
            name = user.profile_picture.name
            if name and user.profile_picture.storage.exists(name):
                url = user.profile_picture.url
                if request:
                    return request.build_absolute_uri(url)
                return url
        except Exception:
            # Ignore broken file references and fall back to Google-hosted URL.
            pass
    return user.google_profile_picture_url


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model - used for profile display."""
    
    full_name = serializers.SerializerMethodField()
    profile_picture = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'is_active', 'date_joined', 'phone_number',
            'profile_picture', 'bio', 'email_verified', 'email_verified_at'
        ]
        read_only_fields = ['id', 'date_joined', 'is_active', 'email_verified', 'email_verified_at']
    
    def get_full_name(self, obj):
        """Get user's full name, falling back to email if name not set."""
        full_name = obj.get_full_name()
        # If full_name is just the email (because first_name and last_name are empty)
        # Return email. Otherwise return the actual full name.
        if not full_name or full_name == obj.email:
            # Extract name from email (before @)
            email_name = obj.email.split('@')[0]
            return email_name.replace('.', ' ').replace('-', ' ').title() or obj.email
        return full_name

    def get_profile_picture(self, obj):
        """Return uploaded image URL, falling back to Google-hosted profile picture."""
        return resolve_profile_picture_url(obj, self.context.get('request'))


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        validators=[validate_password]
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    
    class Meta:
        model = User
        fields = [
            'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'phone_number'
        ]
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
        }
    
    def validate(self, attrs):
        """Validate that passwords match."""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': 'Passwords do not match.'
            })
        return attrs
    
    def create(self, validated_data):
        """Create a new user with validated data."""
        validated_data.pop('password_confirm')
        
        # First user becomes admin automatically
        user_count = User.objects.count()
        role = UserRole.ADMIN if user_count == 0 else UserRole.VISITOR
        
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            phone_number=validated_data.get('phone_number', None),
            role=role
        )
        
        # If first user, also set superuser flags
        if user_count == 0:
            user.is_staff = True
            user.is_superuser = True
            user.save()
        
        return user


class UserLoginSerializer(serializers.Serializer):
    """Serializer for user login."""
    
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    
    def validate(self, attrs):
        """Validate user credentials."""
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            user = authenticate(
                request=self.context.get('request'),
                email=email,
                password=password
            )
            
            if not user:
                raise serializers.ValidationError(
                    'Unable to log in with provided credentials.',
                    code='authorization'
                )
            
            if not user.is_active:
                raise serializers.ValidationError(
                    'User account is disabled.',
                    code='authorization'
                )
            
            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError(
                'Must include "email" and "password".',
                code='authorization'
            )


class GoogleLoginSerializer(serializers.Serializer):
    """Serializer for Google OAuth ID token exchange."""

    id_token = serializers.CharField(required=True, allow_blank=False, trim_whitespace=True)


class TokenResponseSerializer(serializers.Serializer):
    """Serializer for JWT token response."""
    
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = UserSerializer()


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile."""
    
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'phone_number',
            'profile_picture', 'bio'
        ]


class ChangeEmailSerializer(serializers.Serializer):
    """Serializer for changing the authenticated user's email address."""

    new_email = serializers.EmailField(required=True)
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
    )

    def validate_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Incorrect password.')
        return value

    def validate_new_email(self, value):
        value = value.lower().strip()
        user = self.context['request'].user
        if User.objects.filter(email__iexact=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError(
                'This email address is already in use by another account.'
            )
        return value

    def validate(self, attrs):
        user = self.context['request'].user
        if attrs['new_email'] == user.email.lower():
            raise serializers.ValidationError(
                {'new_email': 'New email must be different from your current email.'}
            )
        return attrs

    def save(self, **kwargs):
        user = self.context['request'].user
        user.email = self.validated_data['new_email']
        # Reset verification so the user must verify the new address
        user.email_verified = False
        user.email_verified_at = None
        user.email_verification_token = None
        user.email_verification_token_expires_at = None
        user.save(update_fields=[
            'email', 'email_verified', 'email_verified_at',
            'email_verification_token', 'email_verification_token_expires_at',
        ])
        return user


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for changing user password."""
    
    old_password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
        validators=[validate_password]
    )
    new_password_confirm = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    
    def validate_old_password(self, value):
        """Validate that old password is correct."""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Old password is incorrect.')
        return value
    
    def validate(self, attrs):
        """Validate that new passwords match."""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': 'New passwords do not match.'
            })
        return attrs
    
    def save(self, **kwargs):
        """Save the new password."""
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class AdminUserListSerializer(serializers.ModelSerializer):
    """Serializer for admin user list view."""
    
    full_name = serializers.SerializerMethodField()
    account_status = serializers.SerializerMethodField()
    sub_role_label = serializers.SerializerMethodField()
    profile_picture = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'is_active', 'email_verified', 'email_subscribed',
            'is_suspended', 'date_joined', 'last_login', 'account_status',
            'sub_role_label', 'profile_picture',
        ]
        read_only_fields = fields
    
    def get_full_name(self, obj):
        """Get user's full name, falling back to email if name not set."""
        full_name = obj.get_full_name()
        # If full_name is just the email (because first_name and last_name are empty)
        # Return email. Otherwise return the actual full name.
        if not full_name or full_name == obj.email:
            # Extract name from email (before @)
            email_name = obj.email.split('@')[0]
            return email_name.replace('.', ' ').replace('-', ' ').title() or obj.email
        return full_name
    
    def get_account_status(self, obj):
        """Get current account status."""
        return obj.account_status

    def get_sub_role_label(self, obj):
        """Get sub-role label from ModeratorPermission if present."""
        mp = getattr(obj, 'mod_permissions', None)
        return mp.sub_role_label if mp else ''

    def get_profile_picture(self, obj):
        """Return absolute URL for profile picture, or None."""
        return resolve_profile_picture_url(obj, self.context.get('request'))


class AdminUserDetailSerializer(serializers.ModelSerializer):
    """Serializer for admin user detail view."""
    
    full_name = serializers.SerializerMethodField()
    account_status = serializers.SerializerMethodField()
    suspended_by_email = serializers.SerializerMethodField()
    sub_role_label = serializers.SerializerMethodField()
    profile_picture = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'is_active', 'email_verified', 'email_subscribed',
            'is_suspended', 'suspended_at', 'suspended_by', 'suspended_by_email',
            'suspension_reason', 'suspension_expires_at',
            'date_joined', 'last_login', 'phone_number',
            'profile_picture', 'bio', 'account_status', 'sub_role_label',
        ]
        read_only_fields = fields
    
    def get_full_name(self, obj):
        """Get user's full name, falling back to email if name not set."""
        full_name = obj.get_full_name()
        # If full_name is just the email (because first_name and last_name are empty)
        # Return email. Otherwise return the actual full name.
        if not full_name or full_name == obj.email:
            # Extract name from email (before @)
            email_name = obj.email.split('@')[0]
            return email_name.replace('.', ' ').replace('-', ' ').title() or obj.email
        return full_name
    
    def get_account_status(self, obj):
        """Get current account status."""
        return obj.account_status
    
    def get_suspended_by_email(self, obj):
        """Get email of admin who suspended this user."""
        return obj.suspended_by.email if obj.suspended_by else None

    def get_sub_role_label(self, obj):
        """Get sub-role label from ModeratorPermission if present."""
        mp = getattr(obj, 'mod_permissions', None)
        return mp.sub_role_label if mp else ''

    def get_profile_picture(self, obj):
        """Return absolute URL for profile picture, or None."""
        return resolve_profile_picture_url(obj, self.context.get('request'))


class ChangeRoleSerializer(serializers.Serializer):
    """Serializer for changing user role."""
    
    role = serializers.ChoiceField(choices=UserRole.choices, required=True)
    reason = serializers.CharField(required=False, allow_blank=True)


class SuspendUserSerializer(serializers.Serializer):
    """Serializer for suspending a user."""
    
    reason = serializers.CharField(required=True)
    expires_at = serializers.DateTimeField(required=False, allow_null=True)


class UpdateEmailSubscriptionSerializer(serializers.Serializer):
    """Serializer for updating email subscription."""
    
    email_subscribed = serializers.BooleanField(required=True)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extends the default JWT pair serializer to embed ``role`` and
    ``permissions`` claims directly into the access token payload.

    Access token payload additions:
    - ``role``        — the user's role string (e.g. ``'ADMIN'``/``'MODERATOR'``)
    - ``permissions`` — list of module permission codes (empty list for non-moderators)

    Side-effect: warms the Redis permissions cache for the user so the first
    ``HasModulePermission`` check after login is also a cache hit.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Bake role into the JWT so the frontend can read it without a DB call
        token['role'] = user.role

        # Resolve and embed permissions
        from apps.users.utils.permissions_cache import (
            get_cached_permissions,
            set_cached_permissions,
        )
        perms = get_cached_permissions(str(user.id))
        token['permissions'] = perms

        # Eagerly warm the cache (get_cached_permissions already does this on
        # a miss, but calling set here ensures it's refreshed even on a hit)
        set_cached_permissions(str(user.id), perms)

        return token


class ModeratorPermissionSerializer(serializers.Serializer):
    """
    Serializer for reading / writing a moderator's module permissions.

    Used by the ``ModeratorPermissionView`` (GET + PATCH).
    """

    permissions = serializers.ListField(
        child=serializers.CharField(),
        allow_empty=True,  # Allow zero permissions (moderator with no access)
        help_text='List of permission code strings to grant',
    )
    sub_role_label = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
        help_text='Human-readable label for the sub-role (e.g. "Finance Moderator")',
    )

    def validate_permissions(self, value):
        from apps.users.permission_codes import ALL_CODES

        # Allow empty list - moderator with zero permissions is valid
        if not value:
            return []

        # Filter out unknown/removed codes (e.g., 'fin.hub' if it was removed)
        # This allows moderators with old permissions to save successfully
        valid_codes = [c for c in value if c in ALL_CODES]
        return list(set(valid_codes))  # deduplicate
