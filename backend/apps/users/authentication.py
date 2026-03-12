"""
Custom authentication class for JWT that bypasses CSRF checks.

This is necessary because the default SessionAuthentication in DRF
enforces CSRF protection. Since we're using JWT tokens in the
Authorization header, CSRF protection is not needed.
"""

from rest_framework_simplejwt.authentication import JWTAuthentication


class JWTAuthenticationWithoutCSRF(JWTAuthentication):
    """
    JWT Authentication that explicitly bypasses CSRF checks.
    
    This class extends the default JWTAuthentication and ensures
    that CSRF validation is not enforced for API endpoints using
    JWT bearer tokens.
    """
    
    def enforce_csrf(self, request):
        """
        Override to skip CSRF validation.
        JWT tokens provide sufficient authentication security.
        """
        return  # Do nothing - skip CSRF check
