"""
Custom middleware for debugging requests and rate limiting.
"""
import logging
import time
from collections import defaultdict
from django.http import JsonResponse
from django.core.cache import cache

logger = logging.getLogger('django.request')


class RequestLoggingMiddleware:
    """Log all incoming requests with simplified details."""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Simple request log
        logger.info(f">>> {request.method} {request.path} | Origin: {request.headers.get('Origin', 'N/A')}")
        
        response = self.get_response(request)
        
        # Simple response log
        logger.info(f"<<< {response.status_code} {request.path}")
        
        return response


class RateLimitMiddleware:
    """
    Rate limiting middleware for email verification endpoints.
    
    This middleware protects against abuse by limiting the number of requests
    from a single user or IP address within a time window.
    
    Configuration is done per-endpoint basis in the view itself, but this
    middleware provides the framework for enforcement.
    
    Note: For production with multiple servers, use Redis-based rate limiting
    instead of in-memory cache.
    """
    
    # Endpoints to rate limit (path pattern)
    RATE_LIMITED_ENDPOINTS = [
        '/api/v1/users/auth/verify-email/initiate/',
        '/api/v1/users/auth/verify-email/resend/',
        '/api/v1/users/auth/verify-email/verify/',
    ]
    
    # Rate limits: {endpoint_pattern: (requests, window_seconds)}
    RATE_LIMITS = {
        '/api/v1/users/auth/verify-email/initiate/': (5, 3600),  # 5 per hour
        '/api/v1/users/auth/verify-email/resend/': (5, 3600),     # 5 per hour
        '/api/v1/users/auth/verify-email/verify/': (10, 3600),    # 10 per hour
    }
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Check if this endpoint should be rate limited
        should_rate_limit = any(
            request.path.startswith(endpoint)
            for endpoint in self.RATE_LIMITED_ENDPOINTS
        )
        
        if should_rate_limit:
            # Get identifier (user ID if authenticated, otherwise IP)
            if request.user.is_authenticated:
                identifier = f"user:{request.user.id}"
            else:
                identifier = f"ip:{self._get_client_ip(request)}"
            
            # Check rate limit for this endpoint
            endpoint_key = None
            for pattern, (max_requests, window) in self.RATE_LIMITS.items():
                if request.path.startswith(pattern):
                    endpoint_key = pattern
                    break
            
            if endpoint_key:
                cache_key = f"rate_limit:{endpoint_key}:{identifier}"
                
                # Get current request count
                requests = cache.get(cache_key, [])
                now = time.time()
                
                # Remove old requests outside the window
                max_requests, window = self.RATE_LIMITS[endpoint_key]
                requests = [req_time for req_time in requests if now - req_time < window]
                
                # Check if rate limit exceeded
                if len(requests) >= max_requests:
                    oldest_request = min(requests)
                    retry_after = int(window - (now - oldest_request))
                    
                    return JsonResponse(
                        {
                            'error': 'Rate limit exceeded. Too many requests.',
                            'retry_after_seconds': retry_after
                        },
                        status=429
                    )
                
                # Add current request
                requests.append(now)
                cache.set(cache_key, requests, window)
        
        response = self.get_response(request)
        return response
    
    def _get_client_ip(self, request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class ConditionalCsrfMiddleware:
    """
    Alternative CSRF middleware that bypasses validation for JWT-authenticated requests.
    
    This is Option 2 from the senior developer's recommendations - a more surgical 
    approach than reordering middleware. It skips CSRF validation for requests that 
    use JWT Bearer tokens (Authorization header) while maintaining CSRF protection 
    for session-based authentication.
    
    Usage: Replace 'django.middleware.csrf.CsrfViewMiddleware' with 
    'config.middleware.ConditionalCsrfMiddleware' in settings.MIDDLEWARE
    
    Note: Currently using Option 1 (reordered middleware). This class is kept 
    as a backup/alternative solution.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        # Import here to avoid circular imports
        from django.middleware.csrf import CsrfViewMiddleware
        self.csrf_middleware = CsrfViewMiddleware(get_response)
    
    def __call__(self, request):
        # Check if request is authenticated via JWT (has Authorization header)
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if auth_header.startswith('Bearer '):
            # JWT authentication detected - bypass CSRF for this request
            # Set a flag to skip process_view
            request._skip_csrf = True
            logger.debug(f"Skipping CSRF for JWT request: {request.method} {request.path}")
            return self.get_response(request)
        
        # Otherwise, use standard CSRF middleware
        return self.csrf_middleware(request)
    
    def process_view(self, request, callback, callback_args, callback_kwargs):
        """Intercept view processing to conditionally apply CSRF."""
        # Skip CSRF if JWT was detected
        if getattr(request, '_skip_csrf', False):
            return None
        
        # Otherwise, delegate to standard CSRF middleware
        return self.csrf_middleware.process_view(
            request, callback, callback_args, callback_kwargs
        )


class JWTCSRFExemptMiddleware:
    """
    SENIOR ENGINEER FIX: Bypass CSRF for requests with Bearer token.
    
    This middleware runs BEFORE CsrfViewMiddleware and sets a flag that
    tells Django to skip CSRF validation for JWT-authenticated requests.
    
    This is the correct way to handle CSRF for JWT APIs - exempt JWT requests
    while maintaining CSRF protection for session-based authentication.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Check if request has JWT Bearer token in Authorization header
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if auth_header.startswith('Bearer '):
            # Set Django's internal flag to skip CSRF checks
            setattr(request, '_dont_enforce_csrf_checks', True)
            logger.debug(f"JWT detected - CSRF bypassed for: {request.method} {request.path}")
        
        return self.get_response(request)
