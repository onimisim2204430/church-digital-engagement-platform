"""
Google OAuth service for server-side ID token verification and user provisioning.
"""

from __future__ import annotations

from dataclasses import dataclass
import logging

from django.conf import settings
from django.utils import timezone
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from apps.users.models import User, UserRole


logger = logging.getLogger(__name__)


class GoogleOAuthError(Exception):
    """Base exception for Google OAuth processing errors."""


class GoogleOAuthConfigurationError(GoogleOAuthError):
    """Raised when required Google OAuth configuration is missing."""


class GoogleTokenInvalidError(GoogleOAuthError):
    """Raised when the provided Google token is invalid or expired."""


class GoogleAudienceMismatchError(GoogleOAuthError):
    """Raised when token audience does not match configured client id."""


class GoogleEmailNotVerifiedError(GoogleOAuthError):
    """Raised when Google account email is not verified."""


class GoogleEmailConflictError(GoogleOAuthError):
    """Raised when account is linked to a different Google identity."""


@dataclass
class GoogleProfile:
    """Sanitized profile attributes extracted from a verified Google token."""

    sub: str
    email: str
    first_name: str
    last_name: str
    display_name: str
    picture: str


class GoogleOAuthService:
    """Validates Google ID tokens and manages Google-linked user records."""

    _VALID_ISSUERS = {'accounts.google.com', 'https://accounts.google.com'}

    def verify_id_token(self, raw_id_token: str) -> GoogleProfile:
        logger.info('[GOOGLE_AUTH_DEBUG] BE_STAGE_2: verify_id_token start token_len=%s', len(raw_id_token or ''))
        client_id = (settings.GOOGLE_CLIENT_ID or '').strip()
        if not client_id:
            logger.error('[GOOGLE_AUTH_DEBUG] BE_STAGE_2_FAILED: missing GOOGLE_CLIENT_ID config')
            raise GoogleOAuthConfigurationError('Google OAuth is not configured')

        try:
            token_data = google_id_token.verify_oauth2_token(
                raw_id_token,
                google_requests.Request(),
                client_id,
            )
        except ValueError as exc:
            msg = str(exc).lower()
            if 'audience' in msg or 'aud' in msg:
                logger.warning('[GOOGLE_AUTH_DEBUG] BE_STAGE_2_FAILED: audience mismatch during verify_oauth2_token')
                raise GoogleAudienceMismatchError('Token audience mismatch') from exc
            logger.warning('[GOOGLE_AUTH_DEBUG] BE_STAGE_2_FAILED: token invalid/expired during verify_oauth2_token')
            raise GoogleTokenInvalidError('Invalid or expired Google token') from exc

        issuer = token_data.get('iss')
        if issuer not in self._VALID_ISSUERS:
            logger.warning('[GOOGLE_AUTH_DEBUG] BE_STAGE_2_FAILED: invalid issuer=%s', issuer)
            raise GoogleTokenInvalidError('Invalid token issuer')

        aud = (token_data.get('aud') or '').strip()
        if aud != client_id:
            logger.warning('[GOOGLE_AUTH_DEBUG] BE_STAGE_2_FAILED: aud mismatch token_aud=%s configured_client_id=%s', aud, client_id)
            raise GoogleAudienceMismatchError('Token audience mismatch')

        email = (token_data.get('email') or '').strip().lower()
        sub = (token_data.get('sub') or '').strip()
        if not email or not sub:
            logger.warning('[GOOGLE_AUTH_DEBUG] BE_STAGE_2_FAILED: missing required claims email_present=%s sub_present=%s', bool(email), bool(sub))
            raise GoogleTokenInvalidError('Token missing required identity claims')

        if token_data.get('email_verified') is not True:
            logger.warning('[GOOGLE_AUTH_DEBUG] BE_STAGE_2_FAILED: google email not verified email=%s', email)
            raise GoogleEmailNotVerifiedError('Google email is not verified')

        first_name = (token_data.get('given_name') or '').strip()[:150]
        last_name = (token_data.get('family_name') or '').strip()[:150]
        display_name = (token_data.get('name') or '').strip()[:300]
        picture = (token_data.get('picture') or '').strip()[:500]

        logger.info('[GOOGLE_AUTH_DEBUG] BE_STAGE_2_OK: token verified email=%s sub_prefix=%s', email, sub[:8])
        return GoogleProfile(
            sub=sub,
            email=email,
            first_name=first_name,
            last_name=last_name,
            display_name=display_name,
            picture=picture,
        )

    def get_or_create_user(self, profile: GoogleProfile) -> tuple[User, bool]:
        logger.info('[GOOGLE_AUTH_DEBUG] BE_STAGE_3: get_or_create_user email=%s sub_prefix=%s', profile.email, profile.sub[:8])
        user = User.objects.filter(email__iexact=profile.email).first()

        if user:
            if not user.google_id:
                # First successful Google login for an existing email account: link it.
                user.google_id = profile.sub
                update_fields: list[str] = ['google_id']

                if profile.picture and user.google_profile_picture_url != profile.picture:
                    user.google_profile_picture_url = profile.picture
                    update_fields.append('google_profile_picture_url')

                if profile.first_name and not user.first_name:
                    user.first_name = profile.first_name
                    update_fields.append('first_name')

                if profile.last_name and not user.last_name:
                    user.last_name = profile.last_name
                    update_fields.append('last_name')

                if not user.email_verified:
                    user.email_verified = True
                    user.email_verified_at = timezone.now()
                    update_fields.extend(['email_verified', 'email_verified_at'])

                user.save(update_fields=update_fields)
                logger.info('[GOOGLE_AUTH_DEBUG] BE_STAGE_3_OK: linked existing email account to google user_id=%s updated_fields=%s', user.id, update_fields)
                return user, False

            if user.google_id != profile.sub:
                logger.warning('[GOOGLE_AUTH_DEBUG] BE_STAGE_3_FAILED: google sub mismatch existing_sub_prefix=%s incoming_sub_prefix=%s', (user.google_id or '')[:8], profile.sub[:8])
                raise GoogleEmailConflictError('This email is linked to a different Google account.')

            update_fields: list[str] = []
            if profile.picture and user.google_profile_picture_url != profile.picture:
                user.google_profile_picture_url = profile.picture
                update_fields.append('google_profile_picture_url')

            if profile.first_name and not user.first_name:
                user.first_name = profile.first_name
                update_fields.append('first_name')

            if profile.last_name and not user.last_name:
                user.last_name = profile.last_name
                update_fields.append('last_name')

            if not user.email_verified:
                user.email_verified = True
                user.email_verified_at = timezone.now()
                update_fields.extend(['email_verified', 'email_verified_at'])

            if update_fields:
                user.save(update_fields=update_fields)

            logger.info('[GOOGLE_AUTH_DEBUG] BE_STAGE_3_OK: existing user login user_id=%s updated_fields=%s', user.id, update_fields)
            return user, False

        user = User.objects.create_user(
            email=profile.email,
            password=None,
            first_name=profile.first_name,
            last_name=profile.last_name,
            role=UserRole.VISITOR,
            google_id=profile.sub,
            google_profile_picture_url=profile.picture or None,
            email_verified=True,
            email_verified_at=timezone.now(),
        )
        logger.info('[GOOGLE_AUTH_DEBUG] BE_STAGE_3_OK: new user created user_id=%s email=%s', user.id, user.email)
        return user, True
