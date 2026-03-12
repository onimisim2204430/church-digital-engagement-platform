"""
Password Reset API Views

POST /api/v1/auth/password-reset/request/
    Request body : {"email": "user@example.com"}
    Response 200 : {"success": true, "message": "..."}   (always, prevents enumeration)
    Response 400 : {"error": "..."}  (invalid input)
    Response 429 : {"error": "..."}  (rate-limit)

POST /api/v1/auth/password-reset/confirm/
    Request body : {"email": "...", "code": "123456",
                    "new_password": "...", "confirm_password": "..."}
    Response 200 : {"success": true, "message": "Password reset successful."}
    Response 400 : {"error": "..."}
"""

from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .services.password_reset_service import (
    CodeExpiredError,
    InvalidCodeError,
    PasswordResetError,
    PasswordResetService,
    RateLimitError,
    TooManyAttemptsError,
)


class PasswordResetRequestView(APIView):
    """
    Request a 6-digit password reset code to be sent by email.

    This endpoint is intentionally ambiguous about whether the email exists
    to prevent account enumeration attacks.
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip()

        if not email:
            return Response(
                {'error': 'Email address is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_email(email)
        except DjangoValidationError:
            return Response(
                {'error': 'Please enter a valid email address.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            PasswordResetService.request_reset(email)
        except RateLimitError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        except PasswordResetError:
            # Swallow unexpected internal errors — never reveal details
            pass
        except Exception:
            pass

        # Always 200 — prevents leaking whether an account exists
        return Response({
            'success': True,
            'message': 'If that email address is registered, you will receive a 6-digit code shortly.',
        })


class PasswordResetConfirmView(APIView):
    """
    Verify the 6-digit code and set a new password.
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip()
        code = (request.data.get('code') or '').strip()
        new_password = request.data.get('new_password', '')
        confirm_password = request.data.get('confirm_password', '')

        # ── Field presence ────────────────────────────────────────────────
        missing = [
            f for f, v in [
                ('email', email), ('code', code),
                ('new_password', new_password), ('confirm_password', confirm_password),
            ] if not v
        ]
        if missing:
            return Response(
                {'error': f'Missing required field(s): {", ".join(missing)}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Code format (6 digits) ────────────────────────────────────────
        if not code.isdigit() or len(code) != 6:
            return Response(
                {'error': 'The reset code must be a 6-digit number.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Password rules ────────────────────────────────────────────────
        if new_password != confirm_password:
            return Response(
                {'error': 'Passwords do not match.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(new_password) < 8:
            return Response(
                {'error': 'Password must be at least 8 characters long.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Service call ──────────────────────────────────────────────────
        try:
            PasswordResetService.confirm_reset(email, code, new_password)
        except (CodeExpiredError, TooManyAttemptsError, InvalidCodeError, PasswordResetError) as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'success': True,
            'message': 'Password reset successful. You can now log in with your new password.',
        })
