"""
Password Reset Service

Provides a secure 6-digit code-based password reset flow.

Flow:
  1. request_reset(email)  — generates code, stores hash in cache, sends email
  2. confirm_reset(email, code, new_password) — validates code, sets password

Security measures:
  - Code stored as SHA-256 hash (never plaintext)
  - 15-minute TTL on all cache entries
  - Rate-limit: 60 s cooldown between requests for the same email
  - Max 5 validation attempts before code is invalidated
  - Email enumeration prevented: request_reset always returns silently
"""

import hashlib
import json
import logging
import secrets

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone

from apps.email.services import EmailService
from apps.email.constants import EmailType

logger = logging.getLogger(__name__)

User = get_user_model()

# ── Configuration ────────────────────────────────────────────────────────────
CODE_LENGTH = 6
CODE_TTL = 15 * 60          # seconds (15 minutes)
RESEND_COOLDOWN = 60        # seconds
MAX_ATTEMPTS = 5
_KEY_PREFIX = 'pwd_reset:'


# ── Exceptions ────────────────────────────────────────────────────────────────
class PasswordResetError(Exception):
    """Base error for password reset failures."""


class CodeExpiredError(PasswordResetError):
    """No active code exists for this email (expired or never requested)."""


class InvalidCodeError(PasswordResetError):
    """The supplied code does not match."""


class TooManyAttemptsError(PasswordResetError):
    """Too many failed attempts; code has been invalidated."""


class RateLimitError(PasswordResetError):
    """A code was already sent recently — caller must wait."""


# ── Helpers ───────────────────────────────────────────────────────────────────
def _cache_key(email: str) -> str:
    return f'{_KEY_PREFIX}{email.lower().strip()}'


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode('utf-8')).hexdigest()


# ── Service ───────────────────────────────────────────────────────────────────
class PasswordResetService:

    @classmethod
    def request_reset(cls, email: str) -> None:
        """
        Generate a 6-digit reset code and e-mail it to the user.

        Always returns silently when the email is not registered so that
        callers cannot enumerate valid accounts.

        Raises:
            RateLimitError — if a code was sent within the last 60 seconds.
        """
        email = email.lower().strip()

        # Rate-limit check (fail loudly so the UI can show "please wait")
        existing_raw = cache.get(_cache_key(email))
        if existing_raw:
            try:
                existing = json.loads(existing_raw)
                elapsed = timezone.now().timestamp() - existing.get('sent_at', 0)
                if elapsed < RESEND_COOLDOWN:
                    wait = int(RESEND_COOLDOWN - elapsed)
                    raise RateLimitError(
                        f'A code was already sent. Please wait {wait} second(s) before requesting again.'
                    )
            except (json.JSONDecodeError, TypeError):
                pass  # corrupted entry — proceed to overwrite

        # Look up user — silently skip unknown/inactive accounts
        try:
            user = User.objects.get(email__iexact=email, is_active=True)
        except User.DoesNotExist:
            logger.info('Password reset requested for unknown/inactive email: %s', email)
            return

        # Generate code
        code = f'{secrets.randbelow(10 ** CODE_LENGTH):0{CODE_LENGTH}d}'

        # Persist hash + metadata in cache
        payload = {
            'code_hash': _hash_code(code),
            'attempts': 0,
            'sent_at': timezone.now().timestamp(),
            'user_id': str(user.pk),
        }
        cache.set(_cache_key(email), json.dumps(payload), timeout=CODE_TTL)

        # Resolve display name
        first_name = getattr(user, 'first_name', '') or ''
        user_name = first_name.strip() or email

        # Send e-mail via the Phase 3 EmailService
        try:
            EmailService.send_email(
                to_email=email,
                template_slug='password_reset',
                context={
                    'user_name': user_name,
                    'reset_code': code,
                    'expires_minutes': CODE_TTL // 60,
                    'site_name': 'Church Platform',
                },
                email_type=EmailType.PASSWORD_RESET,
                user=user,
                async_send=False,  # synchronous — Celery not required
            )
        except Exception as exc:
            logger.error('Failed to send password reset email to %s: %s', email, exc, exc_info=True)
            raise PasswordResetError('Failed to send reset email. Please try again.') from exc

    @classmethod
    def confirm_reset(cls, email: str, code: str, new_password: str) -> None:
        """
        Validate the reset code and update the user's password.

        Raises:
            CodeExpiredError     — no active code found for this email
            TooManyAttemptsError — max attempts exceeded; code invalidated
            InvalidCodeError     — wrong code (includes remaining attempts in message)
            PasswordResetError   — user account not found or other error
        """
        email = email.lower().strip()
        key = _cache_key(email)

        raw = cache.get(key)
        if raw is None:
            raise CodeExpiredError('Your reset code has expired or was never requested. Please start over.')

        try:
            data = json.loads(raw)
        except (json.JSONDecodeError, TypeError) as exc:
            cache.delete(key)
            raise CodeExpiredError('Reset session is invalid. Please start over.') from exc

        # Brute-force guard
        if data.get('attempts', 0) >= MAX_ATTEMPTS:
            cache.delete(key)
            raise TooManyAttemptsError(
                'Too many failed attempts. This code has been invalidated. Please request a new one.'
            )

        # Verify code
        if _hash_code(code.strip()) != data['code_hash']:
            data['attempts'] = data.get('attempts', 0) + 1
            cache.set(key, json.dumps(data), timeout=CODE_TTL)
            remaining = MAX_ATTEMPTS - data['attempts']
            raise InvalidCodeError(
                f'Incorrect code. You have {remaining} attempt(s) remaining.'
            )

        # Code correct — apply password change
        try:
            user = User.objects.get(pk=data['user_id'], is_active=True)
        except User.DoesNotExist:
            cache.delete(key)
            raise PasswordResetError('User account could not be found.')

        user.set_password(new_password)
        user.save(update_fields=['password'])
        cache.delete(key)
        logger.info('Password reset successfully for user pk=%s', user.pk)
