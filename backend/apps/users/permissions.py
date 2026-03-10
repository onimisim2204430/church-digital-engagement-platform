"""
Permission classes for role-based access control.

Custom permissions:
- IsAdmin: Only ADMIN users can access (User Management ONLY)
- IsModerator: ADMIN and MODERATOR users can access (Admin Dashboard, Content, Moderation)
- IsMember: MEMBER and ADMIN users can access
- IsOwnerOrAdmin: User must be the owner or ADMIN
- HasModulePermission(code): Moderator must have a specific module permission code
"""

from rest_framework import permissions
from .models import UserRole


class IsAdmin(permissions.BasePermission):
    """
    Permission class to allow only ADMIN users.
    Used for User Management endpoints - MODERATOR is explicitly blocked.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == UserRole.ADMIN
        )


class IsModerator(permissions.BasePermission):
    """
    Permission class to allow ADMIN and MODERATOR users.
    Used for Admin Dashboard, Content Management, and Moderation endpoints.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in [UserRole.ADMIN, UserRole.MODERATOR]
        )


class IsMember(permissions.BasePermission):
    """
    Permission class to allow MEMBER and ADMIN users.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in [UserRole.MEMBER, UserRole.ADMIN]
        )


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permission class to allow object owners or ADMIN users.
    """
    
    def has_object_permission(self, request, view, obj):
        # Admin users can access everything
        if request.user.role == UserRole.ADMIN:
            return True
        
        # Check if object has a 'user' or 'owner' attribute
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'owner'):
            return obj.owner == request.user
        
        return False


class IsModeratorWithAnyPermission(permissions.BasePermission):
    """
    Allows access when the user is ADMIN, or when they are a MODERATOR
    who has been assigned at least one module permission.

    Used to gate the admin area itself (dashboard, etc.) so that
    completely unassigned moderators are blocked at every endpoint.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.role == UserRole.ADMIN:
            return True
        if user.role != UserRole.MODERATOR:
            return False
        from apps.users.utils.permissions_cache import get_cached_permissions
        return len(get_cached_permissions(str(user.id))) > 0


class HasModulePermission(permissions.BasePermission):
    """
    Granular module-level permission check for MODERATOR users.

    Usage on a view::

        permission_classes = [HasModulePermission('fin.hub')]

    Behaviour:
    - ``ADMIN`` users always pass (bypass).
    - Non-authenticated or non-MODERATOR users always fail.
    - For MODERATOR users: fetches the permissions list from Redis (or DB
      fallback) and checks whether ``code`` is present.

    The ``code`` argument must match a key in ``PERMISSION_CODES``
    (``apps/users/permission_codes.py``), but this class does NOT validate
    the code itself for performance reasons — unknown codes simply never match.
    """

    def __init__(self, code: str):
        self.code = code

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        # Admins bypass all module-level checks
        if user.role == UserRole.ADMIN:
            return True

        # Only moderators can hold module permissions
        if user.role != UserRole.MODERATOR:
            return False

        # Resolve permissions from Redis (or DB fallback)
        from apps.users.utils.permissions_cache import get_cached_permissions
        return self.code in get_cached_permissions(str(user.id))
