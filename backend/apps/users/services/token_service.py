"""
Token generation and validation service for email verification.

This service provides cryptographically secure token generation and validation
with hashing for secure storage. Tokens are generated using secrets.token_urlsafe
and hashed using Django's PBKDF2 algorithm before storage.
"""

import secrets
from datetime import timedelta
from typing import Tuple, Optional

from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone


class TokenService:
    """
    Service for generating and validating email verification tokens.
    
    Security features:
    - Cryptographically secure random token generation (32 bytes)
    - Token hashing using PBKDF2 before database storage
    - Configurable token expiration (default: 30 minutes)
    - Prevents token reuse through immediate invalidation
    """
    
    # Token configuration
    TOKEN_BYTES = 32  # 256-bit token
    DEFAULT_EXPIRY_MINUTES = 30
    
    @classmethod
    def generate_token(cls) -> Tuple[str, str]:
        """
        Generate a cryptographically secure random token.
        
        Returns:
            Tuple[str, str]: (raw_token, hashed_token)
                - raw_token: The plain token to send in email (URL-safe)
                - hashed_token: The hashed version to store in database
        
        Example:
            >>> raw_token, hashed_token = TokenService.generate_token()
            >>> # Send raw_token in email, store hashed_token in database
        """
        # Generate URL-safe random token
        raw_token = secrets.token_urlsafe(cls.TOKEN_BYTES)
        
        # Hash token for storage (using Django's password hashing)
        hashed_token = cls._hash_token(raw_token)
        
        return raw_token, hashed_token
    
    @classmethod
    def _hash_token(cls, token: str) -> str:
        """
        Hash a token using Django's password hashing algorithm.
        
        Args:
            token: Plain token to hash
            
        Returns:
            str: Hashed token
        """
        return make_password(token)
    
    @classmethod
    def verify_token(cls, raw_token: str, hashed_token: str) -> bool:
        """
        Verify that a raw token matches the hashed version.
        
        Args:
            raw_token: The plain token from the URL
            hashed_token: The hashed token from the database
            
        Returns:
            bool: True if tokens match, False otherwise
            
        Example:
            >>> is_valid = TokenService.verify_token(url_token, user.email_verification_token)
        """
        if not raw_token or not hashed_token:
            return False
        
        return check_password(raw_token, hashed_token)
    
    @classmethod
    def get_expiry_time(cls, minutes: Optional[int] = None) -> timezone.datetime:
        """
        Calculate token expiration time.
        
        Args:
            minutes: Custom expiry time in minutes (optional)
                    If None, uses DEFAULT_EXPIRY_MINUTES
                    Clamped to 15-60 minutes range for security
            
        Returns:
            datetime: Expiration timestamp
            
        Example:
            >>> expiry = TokenService.get_expiry_time(30)
        """
        if minutes is None:
            minutes = cls.DEFAULT_EXPIRY_MINUTES
        
        # Clamp to safe range (15-60 minutes)
        minutes = max(15, min(60, minutes))
        
        return timezone.now() + timedelta(minutes=minutes)
    
    @classmethod
    def is_token_expired(cls, expires_at: Optional[timezone.datetime]) -> bool:
        """
        Check if a token has expired.
        
        Args:
            expires_at: Token expiration timestamp
            
        Returns:
            bool: True if expired or None, False if still valid
        """
        if expires_at is None:
            return True
        
        return timezone.now() > expires_at
    
    @classmethod
    def can_resend(
        cls,
        last_sent_at: Optional[timezone.datetime],
        cooldown_seconds: int = 60
    ) -> bool:
        """
        Check if enough time has passed to resend verification email.
        
        Args:
            last_sent_at: Timestamp of last email sent
            cooldown_seconds: Minimum seconds between resends (default: 60)
            
        Returns:
            bool: True if can resend, False if still in cooldown
        """
        if last_sent_at is None:
            return True
        
        elapsed = timezone.now() - last_sent_at
        return elapsed.total_seconds() >= cooldown_seconds
