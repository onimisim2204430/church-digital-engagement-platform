from rest_framework.permissions import BasePermission, AllowAny, IsAdminUser


class IsBibleAdmin(IsAdminUser):
    """Only admin users can modify Bible data."""
    pass


class AllowBibleRead(AllowAny):
    """Anyone can read Bible data."""
    pass
