"""
Email verification service for managing the complete verification workflow.

This service handles:
- Generating verification tokens
- Sending verification emails
- Validating tokens and verifying emails
- Rate limiting and security checks
"""

from typing import Optional, Dict, Any
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.html import strip_tags

from .token_service import TokenService


User = get_user_model()


class EmailVerificationError(Exception):
    """Base exception for email verification errors."""
    pass


class AlreadyVerifiedError(EmailVerificationError):
    """Raised when attempting to verify an already verified email."""
    pass


class TokenExpiredError(EmailVerificationError):
    """Raised when verification token has expired."""
    pass


class InvalidTokenError(EmailVerificationError):
    """Raised when verification token is invalid."""
    pass


class RateLimitError(EmailVerificationError):
    """Raised when rate limit is exceeded."""
    pass


class EmailVerificationService:
    """
    Service for managing email verification workflow.
    
    Features:
    - Secure token generation and validation
    - Rate limiting for resend attempts
    - HTML email templates
    - Comprehensive error handling
    """
    
    # Configuration
    VERIFICATION_URL_TEMPLATE = getattr(
        settings,
        'EMAIL_VERIFICATION_URL',
        '{protocol}://{domain}/api/v1/auth/verify-email/?token={token}'
    )
    
    RESEND_COOLDOWN_SECONDS = 60  # 1 minute between resends
    
    @classmethod
    def initiate_verification(cls, user: User, request=None) -> Dict[str, Any]:
        """
        Initiate email verification process for a user.
        
        Steps:
        1. Check if email is already verified
        2. Generate secure token
        3. Update user with token and expiry
        4. Send verification email
        5. Update last sent timestamp
        
        Args:
            user: User instance to verify
            request: HTTP request object (optional, for building URLs)
            
        Returns:
            Dict with success status and message
            
        Raises:
            AlreadyVerifiedError: If email is already verified
            
        Example:
            >>> result = EmailVerificationService.initiate_verification(user, request)
            >>> print(result['message'])
        """
        print(f"\n[DEBUG] EMAIL VERIFICATION SERVICE - START")
        print(f"User email: {user.email}")
        print(f"Email verified: {user.email_verified}")
        
        # Check if already verified
        if user.email_verified:
            print(f"[ERROR] User already verified")
            raise AlreadyVerifiedError('Email is already verified')
        
        # Generate token
        print(f"[DEBUG] Generating secure token...")
        raw_token, hashed_token = TokenService.generate_token()
        print(f"Token generated (length: {len(raw_token)} chars)")
        
        # Update user with token and expiry
        print(f"[DEBUG] Saving token to database...")
        user.email_verification_token = hashed_token
        user.email_verification_token_expires_at = TokenService.get_expiry_time()
        user.email_verification_sent_at = timezone.now()
        user.save(update_fields=[
            'email_verification_token',
            'email_verification_token_expires_at',
            'email_verification_sent_at'
        ])
        print(f"[SUCCESS] User saved to database")
        print(f"Token expires at: {user.email_verification_token_expires_at}")
        print(f"Sent at: {user.email_verification_sent_at}")
        
        # Send verification email
        print(f"[DEBUG] Building verification URL...")
        verification_url = cls._build_verification_url(raw_token, request)
        print(f"URL: {verification_url}")
        
        print(f"[DEBUG] Sending email...")
        cls._send_verification_email(user, verification_url)
        print(f"[SUCCESS] Email sent successfully")
        
        print(f"[SUCCESS] VERIFICATION INITIATED SUCCESSFULLY\n")
        return {
            'success': True,
            'message': 'Verification email sent successfully',
            'expires_in_minutes': TokenService.DEFAULT_EXPIRY_MINUTES
        }
    
    @classmethod
    def resend_verification(cls, user: User, request=None) -> Dict[str, Any]:
        """
        Resend verification email with rate limiting.
        
        Args:
            user: User instance
            request: HTTP request object (optional)
            
        Returns:
            Dict with success status and message
            
        Raises:
            AlreadyVerifiedError: If email is already verified
            RateLimitError: If cooldown period hasn't elapsed
        """
        # Check if already verified
        if user.email_verified:
            raise AlreadyVerifiedError('Email is already verified')
        
        # Check rate limit
        if not TokenService.can_resend(
            user.email_verification_sent_at,
            cls.RESEND_COOLDOWN_SECONDS
        ):
            elapsed = (timezone.now() - user.email_verification_sent_at).total_seconds()
            remaining = cls.RESEND_COOLDOWN_SECONDS - elapsed
            raise RateLimitError(
                f'Please wait {int(remaining)} seconds before requesting another email'
            )
        
        # Invalidate old token and generate new one
        return cls.initiate_verification(user, request)
    
    @classmethod
    def verify_email_by_token(cls, raw_token: str) -> Dict[str, Any]:
        """
        PUBLIC EMAIL VERIFICATION - Find user by token and verify email.
        
        This method is used for public verification links (no authentication).
        The token itself identifies the user.
        
        Validation steps:
        1. Find user with non-expired token
        2. Verify token hash matches
        3. Check if already verified
        4. Update user as verified
        5. Invalidate token (prevent reuse)
        
        Args:
            raw_token: Raw verification token from email URL
            
        Returns:
            Dict with success status, message, email, and verified_at timestamp
            
        Raises:
            TokenExpiredError: If token has expired
            InvalidTokenError: If token is invalid or doesn't match any user
            AlreadyVerifiedError: If email already verified
        """
        import logging
        logger = logging.getLogger(__name__)
        
        if not raw_token:
            raise InvalidTokenError("No token provided")
        
        logger.info(f"[VERIFY] Attempting verification with token: {raw_token[:10]}...")
        
        # Find users with non-expired tokens and unverified emails
        candidate_users = User.objects.filter(
            email_verification_token__isnull=False,
            email_verification_token_expires_at__gt=timezone.now(),
            email_verified=False
        )
        
        logger.info(f"[VERIFY] Found {candidate_users.count()} candidate users with active tokens")
        
        # Find the user whose hashed token matches the raw token
        user = None
        for candidate in candidate_users:
            if TokenService.verify_token(raw_token, candidate.email_verification_token):
                user = candidate
                logger.info(f"[VERIFY] Token matched for user: {user.email}")
                break
        
        if not user:
            # Check if token exists but is expired
            expired_users = User.objects.filter(
                email_verification_token__isnull=False,
                email_verification_token_expires_at__lte=timezone.now(),
                email_verified=False
            )
            
            for expired_user in expired_users:
                if TokenService.verify_token(raw_token, expired_user.email_verification_token):
                    logger.info(f"[VERIFY] Expired token attempt for user: {expired_user.email}")
                    raise TokenExpiredError(
                        "Verification link has expired. Please request a new one."
                    )
            
            logger.warning(f"[VERIFY] Invalid token - no matching user found")
            raise InvalidTokenError(
                "Invalid verification link. Please request a new one."
            )
        
        # Double-check if already verified (edge case)
        if user.email_verified:
            logger.info(f"[VERIFY] Email already verified for user: {user.email}")
            raise AlreadyVerifiedError("Email is already verified")
        
        # Mark as verified
        user.email_verified = True
        user.email_verified_at = timezone.now()
        
        # Clear token fields (security - prevent reuse)
        user.email_verification_token = None
        user.email_verification_token_expires_at = None
        user.email_verification_sent_at = None
        
        user.save(update_fields=[
            'email_verified',
            'email_verified_at',
            'email_verification_token',
            'email_verification_token_expires_at',
            'email_verification_sent_at'
        ])
        
        logger.info(f"[SUCCESS] Email verified successfully for user: {user.email}")
        
        return {
            'success': True,
            'message': 'Email verified successfully',
            'email': user.email,
            'verified_at': user.email_verified_at.isoformat()
        }
    
    @classmethod
    def verify_email(cls, user: User, token: str) -> Dict[str, Any]:
        """
        AUTHENTICATED EMAIL VERIFICATION - Verify email for logged-in user.
        
        This method is for authenticated users who have the token.
        Use verify_email_by_token() for public verification links.
        
        Args:
            user: Authenticated User instance
            token: Raw verification token from URL
            
        Returns:
            Dict with success status and message
            
        Raises:
            AlreadyVerifiedError: If email already verified
            InvalidTokenError: If token is invalid or doesn't match
            TokenExpiredError: If token has expired
        """
        # Check if already verified
        if user.email_verified:
            raise AlreadyVerifiedError('Email is already verified')
        
        # Check token exists
        if not user.email_verification_token:
            raise InvalidTokenError('No verification token found')
        
        # Check expiration
        if TokenService.is_token_expired(user.email_verification_token_expires_at):
            raise TokenExpiredError('Verification token has expired')
        
        # Validate token
        if not TokenService.verify_token(token, user.email_verification_token):
            raise InvalidTokenError('Invalid verification token')
        
        # Mark as verified and invalidate token
        user.email_verified = True
        user.email_verified_at = timezone.now()
        user.email_verification_token = None
        user.email_verification_token_expires_at = None
        user.email_verification_sent_at = None
        user.save(update_fields=[
            'email_verified',
            'email_verified_at',
            'email_verification_token',
            'email_verification_token_expires_at',
            'email_verification_sent_at'
        ])
        
        return {
            'success': True,
            'message': 'Email verified successfully',
            'verified_at': user.email_verified_at
        }
    
    @classmethod
    def _build_verification_url(cls, token: str, request=None) -> str:
        """
        Build verification URL with token.
        
        Args:
            token: Raw verification token
            request: HTTP request object for protocol/domain detection
            
        Returns:
            str: Complete verification URL
        """
        if request:
            protocol = 'https' if request.is_secure() else 'http'
            domain = request.get_host()
        else:
            protocol = 'https' if not settings.DEBUG else 'http'
            domain = getattr(settings, 'SITE_DOMAIN', 'localhost:3000')
        
        return cls.VERIFICATION_URL_TEMPLATE.format(
            protocol=protocol,
            domain=domain,
            token=token
        )
    
    @classmethod
    def _send_verification_email(cls, user: User, verification_url: str) -> None:
        """
        Send verification email to user.
        
        Args:
            user: User instance
            verification_url: Complete verification URL with token
        """
        from django.conf import settings
        
        print(f"\n[EMAIL SEND] ===== EMAIL SENDING PROCESS =====")
        print(f"[EMAIL SEND] Recipient: {user.email}")
        print(f"[EMAIL SEND] Verification URL: {verification_url}")
        print(f"[EMAIL SEND] EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
        print(f"[EMAIL SEND] EMAIL_HOST: {getattr(settings, 'EMAIL_HOST', 'NOT SET')}")
        print(f"[EMAIL SEND] EMAIL_HOST_USER: {getattr(settings, 'EMAIL_HOST_USER', 'NOT SET')}")
        print(f"[EMAIL SEND] DEFAULT_FROM_EMAIL: {getattr(settings, 'DEFAULT_FROM_EMAIL', 'NOT SET')}")
        
        site_name = getattr(settings, 'SITE_NAME', 'Our Platform')
        
        # Email context
        context = {
            'user': user,
            'verification_url': verification_url,
            'site_name': site_name,
            'expiry_minutes': TokenService.DEFAULT_EXPIRY_MINUTES,
        }
        
        print(f"[EMAIL SEND] Rendering email templates...")
        
        # Render HTML and plain text versions
        html_message = render_to_string(
            'emails/email_verification.html',
            context
        )
        plain_message = render_to_string(
            'emails/email_verification.txt',
            context
        )
        
        print(f"[EMAIL SEND] Templates rendered successfully")
        print(f"[EMAIL SEND] HTML length: {len(html_message)} chars")
        print(f"[EMAIL SEND] Plain text length: {len(plain_message)} chars")
        
        # Send email
        subject = f'Verify your email - {site_name}'
        from_email = settings.DEFAULT_FROM_EMAIL
        recipient_list = [user.email]
        
        print(f"[EMAIL SEND] Calling send_mail()...")
        print(f"[EMAIL SEND]   Subject: {subject}")
        print(f"[EMAIL SEND]   From: {from_email}")
        print(f"[EMAIL SEND]   To: {recipient_list}")
        print(f"[EMAIL SEND]   HTML: {'Yes' if html_message else 'No'}")
        
        try:
            result = send_mail(
                subject=subject,
                message=plain_message,
                from_email=from_email,
                recipient_list=recipient_list,
                html_message=html_message,
                fail_silently=False,
            )
            
            print(f"[EMAIL SEND] send_mail() returned: {result}")
            print(f"[EMAIL SEND] SUCCESS - Email sent successfully")
            print(f"[EMAIL SEND] ==========================================\n")
            
        except Exception as e:
            print(f"[EMAIL SEND] ERROR - Failed to send email: {e}")
            print(f"[EMAIL SEND] Error type: {type(e).__name__}")
            import traceback
            traceback.print_exc()
            print(f"[EMAIL SEND] ==========================================\n")
            raise
