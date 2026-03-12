"""
API endpoints for email verification workflow.

Endpoints:
- POST /api/v1/auth/verify-email/initiate/ - Send verification email
- POST /api/v1/auth/verify-email/resend/ - Resend verification email
- POST /api/v1/auth/verify-email/verify/ - Verify email with token
"""

from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes

from .services import EmailVerificationService
from .services.email_verification_service import (
    AlreadyVerifiedError,
    TokenExpiredError,
    InvalidTokenError,
    RateLimitError
)


class InitiateEmailVerificationView(APIView):
    """
    Initiate email verification process.
    
    Sends a verification email to the authenticated user's email address
    with a secure token that expires in 30 minutes.
    
    **Authentication Required:** Yes (JWT)
    **CSRF:** Bypassed via JWTCSRFExemptMiddleware
    
    **Response:**
    - 200: Verification email sent successfully
    - 400: Email already verified
    - 429: Rate limit exceeded (too many recent requests)
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        tags=['Email Verification'],
        summary='Send verification email',
        description='Sends a verification email to the authenticated user. Token expires in 30 minutes.',
        responses={
            200: OpenApiResponse(
                description='Verification email sent successfully',
                examples=[
                    OpenApiExample(
                        'Success',
                        value={
                            'success': True,
                            'message': 'Verification email sent successfully',
                            'expires_in_minutes': 30
                        }
                    )
                ]
            ),
            400: OpenApiResponse(description='Email already verified'),
            429: OpenApiResponse(description='Rate limit exceeded')
        }
    )
    def post(self, request):
        """
        Handle POST request for email verification initiation.
        Returns consistent JSON structure with success, message, and data fields.
        """
        try:
            # CRITICAL DEBUG - Check email configuration at runtime
            from django.conf import settings
            print("\n" + "="*80)
            print("[EMAIL CONFIG] Configuration at request time:")
            print(f"[EMAIL CONFIG]   BACKEND: {settings.EMAIL_BACKEND}")
            print(f"[EMAIL CONFIG]   HOST: {getattr(settings, 'EMAIL_HOST', 'NOT SET')}")
            print(f"[EMAIL CONFIG]   PORT: {getattr(settings, 'EMAIL_PORT', 'NOT SET')}")
            print(f"[EMAIL CONFIG]   USER: {getattr(settings, 'EMAIL_HOST_USER', 'NOT SET')}")
            print(f"[EMAIL CONFIG]   FROM: {getattr(settings, 'DEFAULT_FROM_EMAIL', 'NOT SET')}")
            print(f"[EMAIL CONFIG]   USE_TLS: {getattr(settings, 'EMAIL_USE_TLS', 'NOT SET')}")
            print("="*80 + "\n")
            
            result = EmailVerificationService.initiate_verification(
                user=request.user,
                request=request
            )
            
            # CRITICAL DEBUG - See what we're actually returning
            import json
            print(f"\n[DEBUG] ===== RESPONSE STRUCTURE DIAGNOSIS =====")
            print(f"[DEBUG] RAW RESULT TYPE: {type(result)}")
            print(f"[DEBUG] RAW RESULT CONTENT: {result}")
            try:
                print(f"[DEBUG] JSON RESPONSE: {json.dumps(result, indent=2)}")
                print(f"[DEBUG] RESPONSE SIZE: {len(json.dumps(result))} bytes")
            except Exception as json_err:
                print(f"[DEBUG] JSON SERIALIZATION FAILED: {json_err}")
            print(f"[DEBUG] ==========================================\n")
            
            return Response(result, status=status.HTTP_200_OK)
            
        except AlreadyVerifiedError as e:
            return Response({
                'success': False,
                'error': str(e),
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except RateLimitError as e:
            return Response({
                'success': False,
                'error': str(e),
                'message': str(e),
                'retry_after_seconds': getattr(e, 'retry_after', 60)
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)
            
        except Exception as e:
            print(f"[ERROR] Email verification failed: {e}")
            import traceback
            traceback.print_exc()
            
            return Response({
                'success': False,
                'error': 'Failed to send verification email',
                'message': 'An internal error occurred. Please try again later.',
                'type': type(e).__name__
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get(self, request):
        """Explicitly reject GET requests."""
        return Response(
            {'error': 'Method not allowed', 'message': 'Use POST to send verification email'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )


class ResendEmailVerificationView(APIView):
    """
    Resend email verification.
    
    Generates a new token and resends the verification email.
    Rate limited to prevent abuse (60-second cooldown between requests).
    
    **Authentication Required:** Yes (JWT)
    **CSRF:** Bypassed via JWTCSRFExemptMiddleware
    
    **Response:**
    - 200: Verification email resent successfully
    - 400: Email already verified
    - 429: Rate limit exceeded (too soon after last request)
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        tags=['Email Verification'],
        summary='Resend verification email',
        description='Resends verification email. Rate limited to once per 60 seconds.',
        responses={
            200: OpenApiResponse(
                description='Verification email resent',
                examples=[
                    OpenApiExample(
                        'Success',
                        value={
                            'success': True,
                            'message': 'Verification email sent successfully',
                            'expires_in_minutes': 30
                        }
                    )
                ]
            ),
            400: OpenApiResponse(description='Email already verified'),
            429: OpenApiResponse(
                description='Rate limit exceeded',
                examples=[
                    OpenApiExample(
                        'Rate Limited',
                        value={'error': 'Please wait 45 seconds before requesting another email'}
                    )
                ]
            )
        }
    )
    def post(self, request):
        try:
            result = EmailVerificationService.resend_verification(
                user=request.user,
                request=request
            )
            return Response(result, status=status.HTTP_200_OK)
            
        except AlreadyVerifiedError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except RateLimitError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        except Exception as e:
            return Response(
                {'error': 'Failed to resend verification email'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VerifyEmailView(APIView):
    """
    Verify email address using token from email link.
    
    PUBLIC ENDPOINT - No authentication required.
    Users click verification link in email, token identifies the user.
    Tokens expire after 30 minutes and can only be used once.
    
    **Authentication Required:** No (public endpoint)
    **CSRF:** Not required for GET requests
    
    **Query Parameters:**
    - token (string): Verification token from email link
    
    **Response:**
    - 200: Email verified successfully
    - 400: Invalid, expired, or already used token
    """
    authentication_classes = []  # No authentication needed
    permission_classes = []      # Public endpoint
    
    @extend_schema(
        tags=['Email Verification'],
        summary='Verify email with token',
        description='PUBLIC ENDPOINT - Verifies user email using token from email link. No authentication required.',
        parameters=[
            {
                'name': 'token',
                'in': 'query',
                'required': True,
                'schema': {'type': 'string'},
                'description': 'Verification token from email link'
            }
        ],
        responses={
            200: OpenApiResponse(
                description='Email verified successfully',
                examples=[
                    OpenApiExample(
                        'Success',
                        value={
                            'success': True,
                            'message': 'Email verified successfully',
                            'email': 'user@example.com',
                            'verified_at': '2026-02-11T10:30:00Z'
                        }
                    )
                ]
            ),
            400: OpenApiResponse(
                description='Invalid or expired token',
                examples=[
                    OpenApiExample(
                        'No Token',
                        value={
                            'success': False,
                            'error': 'No verification token provided',
                            'message': 'Verification link is invalid',
                            'code': 'missing_token'
                        }
                    ),
                    OpenApiExample(
                        'Expired Token',
                        value={
                            'success': False,
                            'error': 'Token expired',
                            'message': 'This verification link has expired',
                            'code': 'token_expired'
                        }
                    ),
                    OpenApiExample(
                        'Invalid Token',
                        value={
                            'success': False,
                            'error': 'Invalid token',
                            'message': 'This verification link is invalid',
                            'code': 'invalid_token'
                        }
                    ),
                    OpenApiExample(
                        'Already Verified',
                        value={
                            'success': False,
                            'error': 'Already verified',
                            'message': 'This email is already verified',
                            'code': 'already_verified'
                        }
                    )
                ]
            ),
            500: OpenApiResponse(
                description='Server error',
                examples=[
                    OpenApiExample(
                        'Server Error',
                        value={
                            'success': False,
                            'error': 'Verification failed',
                            'message': 'An error occurred while verifying your email',
                            'code': 'server_error'
                        }
                    )
                ]
            )
        }
    )
    def get(self, request):
        """
        GET /api/v1/auth/verify-email/?token=<token>
        PUBLIC ENDPOINT - Verifies email using token from email link.
        """
        import logging
        logger = logging.getLogger(__name__)
        
        token = request.query_params.get('token')
        
        if not token:
            return Response({
                'success': False,
                'error': 'No verification token provided',
                'message': 'Verification link is invalid. Please request a new one.',
                'code': 'missing_token'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # PUBLIC VERIFICATION - finds user by token
            result = EmailVerificationService.verify_email_by_token(token)
            
            return Response({
                'success': True,
                'message': result.get('message', 'Email verified successfully'),
                'email': result.get('email'),
                'verified_at': result.get('verified_at')
            }, status=status.HTTP_200_OK)
            
        except TokenExpiredError as e:
            logger.info(f"Expired token attempt: {str(e)}")
            return Response({
                'success': False,
                'error': 'Token expired',
                'message': 'This verification link has expired. Please request a new one.',
                'code': 'token_expired'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except InvalidTokenError as e:
            logger.warning(f"Invalid token attempt: {str(e)}")
            return Response({
                'success': False,
                'error': 'Invalid token',
                'message': 'This verification link is invalid or has already been used.',
                'code': 'invalid_token'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except AlreadyVerifiedError as e:
            logger.info(f"Already verified attempt: {str(e)}")
            return Response({
                'success': False,
                'error': 'Already verified',
                'message': 'This email address is already verified.',
                'code': 'already_verified'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Email verification error: {e}", exc_info=True)
            return Response({
                'success': False,
                'error': 'Verification failed',
                'message': 'An error occurred while verifying your email. Please try again.',
                'code': 'server_error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
