"""
Custom User model for Church Digital Engagement Platform.

This model extends Django's AbstractBaseUser to provide:
- UUID-based primary key
- Role-based access control (VISITOR, MEMBER, ADMIN)
- Email as the primary identifier
- Profile information fields
"""

import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserRole(models.TextChoices):
    """User role definitions for access control."""
    VISITOR = 'VISITOR', 'Visitor'
    MEMBER = 'MEMBER', 'Member'
    MODERATOR = 'MODERATOR', 'Moderator'
    ADMIN = 'ADMIN', 'Admin'  # System-level only, not visible in user management


class UserManager(BaseUserManager):
    """Custom user manager for email-based authentication."""
    
    def create_user(self, email, password=None, **extra_fields):
        """
        Create and save a regular user with the given email and password.
        """
        if not email:
            raise ValueError('Users must have an email address')
        
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """
        Create and save a superuser with the given email and password.
        """
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', UserRole.ADMIN)
        extra_fields.setdefault('is_active', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom User model with UUID primary key and role-based access.
    
    Fields:
        id: UUID primary key
        email: Unique email address (used for authentication)
        first_name: User's first name
        last_name: User's last name
        role: User role (VISITOR, MEMBER, ADMIN)
        is_active: Account active status
        is_staff: Staff status (for Django admin access)
        date_joined: Account creation timestamp
        last_login: Last login timestamp
        phone_number: Optional contact number
        profile_picture: Optional profile image
        bio: Optional user biography
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text='Unique identifier for the user'
    )
    
    email = models.EmailField(
        unique=True,
        max_length=255,
        help_text='Email address (used for authentication)'
    )
    
    first_name = models.CharField(
        max_length=150,
        blank=True,
        help_text='User first name'
    )
    
    last_name = models.CharField(
        max_length=150,
        blank=True,
        help_text='User last name'
    )
    
    role = models.CharField(
        max_length=10,
        choices=UserRole.choices,
        default=UserRole.VISITOR,
        help_text='User role for access control'
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text='Designates whether this user should be treated as active'
    )
    
    is_staff = models.BooleanField(
        default=False,
        help_text='Designates whether the user can log into the admin site'
    )
    
    date_joined = models.DateTimeField(
        default=timezone.now,
        help_text='Date and time when the account was created'
    )
    
    phone_number = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text='Contact phone number'
    )
    
    profile_picture = models.ImageField(
        upload_to='profile_pictures/',
        blank=True,
        null=True,
        help_text='User profile picture'
    )
    
    bio = models.TextField(
        blank=True,
        null=True,
        help_text='User biography or description'
    )
    
    # Email subscription management
    email_subscribed = models.BooleanField(
        default=True,
        help_text='Whether user is subscribed to email campaigns'
    )
    
    # Email verification management
    email_verified = models.BooleanField(
        default=False,
        help_text='Whether email address has been verified'
    )
    
    email_verified_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Timestamp when email was verified'
    )
    
    email_verification_token = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text='Hashed email verification token'
    )
    
    email_verification_token_expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Expiration time for email verification token'
    )
    
    email_verification_sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Last time verification email was sent (for rate limiting)'
    )
    
    # Suspension management
    is_suspended = models.BooleanField(
        default=False,
        help_text='Temporary suspension status'
    )
    
    suspended_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the account was suspended'
    )
    
    suspended_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='suspended_users',
        help_text='Admin who suspended this account'
    )
    
    suspension_reason = models.TextField(
        blank=True,
        null=True,
        help_text='Reason for suspension'
    )
    
    suspension_expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When suspension automatically expires'
    )
    
    # Required fields for AbstractBaseUser
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']
    
    objects = UserManager()
    
    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-date_joined']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['role']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        """String representation of the user."""
        return self.email
    
    def get_full_name(self):
        """Return the user's full name."""
        full_name = f'{self.first_name} {self.last_name}'.strip()
        return full_name or self.email
    
    def get_short_name(self):
        """Return the user's first name."""
        return self.first_name or self.email
    
    @property
    def is_visitor(self):
        """Check if user has VISITOR role."""
        return self.role == UserRole.VISITOR
    
    @property
    def is_member(self):
        """Check if user has MEMBER role."""
        return self.role == UserRole.MEMBER
    
    @property
    def is_admin(self):
        """Check if user has ADMIN role."""
        return self.role == UserRole.ADMIN
    
    @property
    def account_status(self):
        """Get current account status."""
        if not self.is_active:
            return 'disabled'
        if self.is_suspended:
            # Check if suspension has expired
            if self.suspension_expires_at and timezone.now() > self.suspension_expires_at:
                # Auto-unsuspend
                self.is_suspended = False
                self.save()
                return 'active'
            return 'suspended'
        return 'active'
    
    def suspend(self, suspended_by, reason, expires_at=None):
        """Suspend user account."""
        self.is_suspended = True
        self.suspended_at = timezone.now()
        self.suspended_by = suspended_by
        self.suspension_reason = reason
        self.suspension_expires_at = expires_at
        self.save()
    
    def unsuspend(self):
        """Remove suspension from user account."""
        self.is_suspended = False
        self.suspended_at = None
        self.suspended_by = None
        self.suspension_reason = None
        self.suspension_expires_at = None
        self.save()


class ModeratorPermission(models.Model):
    """
    Stores granular module-level permissions for MODERATOR users.

    Each moderator gets exactly one row here (OneToOneField).  The
    `permissions` JSONField holds a list of permission code strings
    (e.g. ``['fin.hub', 'content.posts']``) from PERMISSION_CODES in
    ``apps/users/permission_codes.py``.

    Changes to this record automatically invalidate the Redis cache via
    the ``post_save`` signal defined at the bottom of this module.
    """

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='mod_permissions',
        help_text='Moderator user these permissions apply to',
    )
    permissions = models.JSONField(
        default=list,
        help_text='List of permission code strings granted to this moderator',
    )
    sub_role_label = models.CharField(
        max_length=100,
        blank=True,
        help_text='Human-readable label for the moderator sub-role (e.g. "Finance Moderator")',
    )
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='permissions_granted',
        help_text='Admin who last updated these permissions',
    )

    class Meta:
        db_table = 'moderator_permissions'
        verbose_name = 'Moderator Permission'
        verbose_name_plural = 'Moderator Permissions'

    def __str__(self):
        return f'Permissions for {self.user.email} ({self.sub_role_label or "custom"})'

    def has_permission(self, code: str) -> bool:
        """Return True if *code* is in the granted permissions list."""
        return code in self.permissions

    def get_permissions_set(self) -> set:
        """Return permissions as a set for O(1) membership checks."""
        return set(self.permissions)


from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender=ModeratorPermission)
def invalidate_permissions_cache_on_save(sender, instance, **kwargs):
    """
    Invalidate Redis permissions cache whenever a ModeratorPermission record
    is saved, so the next request re-fetches fresh data.
    """
    try:
        from apps.users.utils.permissions_cache import invalidate_permissions_cache
        invalidate_permissions_cache(str(instance.user_id))
    except Exception:
        # Never let a cache miss crash a DB save
        pass
