"""
SendGrid email provider — Phase 2 full implementation.

Uses the official `sendgrid` Python SDK (sendgrid>=6.11.0).
Falls back gracefully to requests if the SDK is not installed.

Configuration keys (from EMAIL_SERVICE_CONFIG['providers'][n]):
    type                 = "SENDGRID"
    api_key_env_var      = name of the env-var holding the API key
                           (default: "SENDGRID_API_KEY")
    sandbox_mode         = True to enable SendGrid sandbox (no real delivery)
    track_opens          = True (default) — enable open tracking
    track_clicks         = True (default) — enable click tracking
    default_from_email / default_from_name — override global defaults
    webhook_signing_secret_env_var = env-var for webhook HMAC secret
                           (default: "SENDGRID_WEBHOOK_SECRET")

Required package:  sendgrid>=6.11.0  (see requirements.txt)
"""

import hashlib
import hmac
import logging
import os
import time
from typing import Dict, List, Optional

import requests  # noqa: E402 — kept at module level so tests can mock it

from .base import AbstractEmailProvider, EmailPayload, ProviderResult
from .exceptions import (
    ProviderAuthenticationError,
    ProviderConfigurationError,
    ProviderPermanentFailureError,
    ProviderRateLimitError,
    ProviderTemporaryFailureError,
)

logger = logging.getLogger('email.providers.sendgrid')

_SENDGRID_SEND_URL = 'https://api.sendgrid.com/v3/mail/send'
_SENDGRID_VALIDATE_URL = 'https://api.sendgrid.com/v3/user/profile'

# HTTP status codes that are safe to retry
_RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}

# HTTP status codes that are permanent failures
_PERMANENT_FAILURE_CODES = {400, 401, 403, 404, 406, 413}


def _try_import_sendgrid():
    """Try to import the sendgrid SDK; return None if unavailable."""
    try:
        import sendgrid
        from sendgrid.helpers.mail import (
            Mail, Email, To, Content, Bcc, Cc, ReplyTo,
            TrackingSettings, OpenTracking, ClickTracking, SandBoxMode,
        )
        return sendgrid, Mail, Email, To, Content, Bcc, Cc, ReplyTo, TrackingSettings, OpenTracking, ClickTracking, SandBoxMode
    except ImportError:
        return None


class SendGridProvider(AbstractEmailProvider):
    """
    Production SendGrid Mail Send API v3 provider.

    Features:
    - Sends via the official sendgrid SDK (falls back to requests if not installed)
    - Open and click tracking enabled by default (supports Phase 6)
    - Sandbox mode in development (set sandbox_mode=True in config)
    - Structured error translation to typed ProviderError exceptions
    - Rate-limit awareness: reads Retry-After header on 429 responses
    - Webhook signature verification for Phase 6 (ECDSA, SendGrid Event Webhooks)
    - health_check() validates the API key with a lightweight GET request
    """

    PROVIDER_NAME = 'SENDGRID'

    def __init__(self, config: dict) -> None:
        super().__init__(config)
        self._api_key: Optional[str] = None
        self._sandbox: bool = False
        self._track_opens: bool = True
        self._track_clicks: bool = True
        self._webhook_secret: Optional[str] = None
        self._resolved = False

    # ------------------------------------------------------------------
    # Config resolution  (lazy — env-vars read at first use)
    # ------------------------------------------------------------------

    def _resolve_config(self) -> None:
        if self._resolved:
            return

        api_key_env = self.config.get('api_key_env_var', 'SENDGRID_API_KEY')
        self._api_key = os.environ.get(api_key_env, '')

        webhook_env = self.config.get(
            'webhook_signing_secret_env_var', 'SENDGRID_WEBHOOK_SECRET'
        )
        self._webhook_secret = os.environ.get(webhook_env, '')

        self._sandbox = bool(self.config.get('sandbox_mode', False))
        self._track_opens = bool(self.config.get('track_opens', True))
        self._track_clicks = bool(self.config.get('track_clicks', True))
        self._resolved = True

    # ------------------------------------------------------------------
    # AbstractEmailProvider interface
    # ------------------------------------------------------------------

    def send(self, payload: EmailPayload) -> ProviderResult:
        """Deliver one email via SendGrid Mail Send API v3."""
        self._resolve_config()

        if not self._api_key:
            return ProviderResult(
                success=False,
                provider_name=self.PROVIDER_NAME,
                error_message='SendGrid API key is not configured.',
                error_code='NO_API_KEY',
            )

        sg_modules = _try_import_sendgrid()
        if sg_modules:
            return self._send_via_sdk(payload, sg_modules)
        return self._send_via_requests(payload)

    def validate_config(self) -> None:
        """Raise ProviderConfigurationError if the API key env-var is missing."""
        self._resolve_config()
        if not self._api_key:
            api_key_env = self.config.get('api_key_env_var', 'SENDGRID_API_KEY')
            raise ProviderConfigurationError(
                f'SendGrid API key env-var "{api_key_env}" is not set. '
                f'Export {api_key_env}=<your-key> before starting the server.',
                provider_name=self.PROVIDER_NAME,
                error_code='MISSING_API_KEY',
            )

    def health_check(self) -> bool:
        """
        Verify the API key is valid by calling the /v3/user/profile endpoint.
        Returns True only when a 200 response is received.
        """
        self._resolve_config()
        if not self._api_key:
            return False

        try:
            resp = requests.get(
                _SENDGRID_VALIDATE_URL,
                headers={
                    'Authorization': f'Bearer {self._api_key}',
                    'Content-Type': 'application/json',
                },
                timeout=5,
            )
            healthy = resp.status_code == 200
            if not healthy:
                logger.warning(
                    'SendGrid health check returned %s: %s',
                    resp.status_code,
                    resp.text[:200],
                )
            return healthy
        except Exception as exc:
            logger.warning('SendGrid health check failed: %s', exc)
            return False

    # ------------------------------------------------------------------
    # Send via official SDK
    # ------------------------------------------------------------------

    def _send_via_sdk(self, payload: EmailPayload, sg_modules) -> ProviderResult:
        """Send using the sendgrid Python SDK."""
        sendgrid, Mail, Email, To, Content, Bcc, Cc, ReplyTo, TrackingSettings, OpenTracking, ClickTracking, SandBoxMode = sg_modules

        try:
            message = Mail()

            # Addressing
            message.from_email = Email(payload.from_email, payload.from_name or None)
            message.to = To(payload.to_email, payload.to_name or None)
            message.subject = payload.subject

            if payload.reply_to:
                message.reply_to = ReplyTo(payload.reply_to)

            # Body content
            if payload.body_text:
                message.add_content(Content('text/plain', payload.body_text))
            if payload.body_html:
                message.add_content(Content('text/html', payload.body_html))

            # CC / BCC
            for addr in payload.cc:
                message.add_cc(Cc(addr))
            for addr in payload.bcc:
                message.add_bcc(Bcc(addr))

            # Custom headers
            for k, v in payload.headers.items():
                message.add_header(k, v)

            # Tracking settings
            tracking = TrackingSettings()
            tracking.open_tracking = OpenTracking(enable=self._track_opens)
            tracking.click_tracking = ClickTracking(
                enable=self._track_clicks,
                enable_text=self._track_clicks,
            )
            message.tracking_settings = tracking

            # Sandbox / categories
            if self._sandbox:
                message.mail_settings = {'sandbox_mode': {'enable': True}}

            categories = payload.extra.get('categories', [])
            for cat in categories:
                message.add_category(cat)

            sg_client = sendgrid.SendGridAPIClient(api_key=self._api_key)
            response = sg_client.send(message)

            return self._interpret_response(
                status_code=response.status_code,
                headers=dict(response.headers) if response.headers else {},
                body=response.body or b'',
                message_id=payload.message_id,
            )

        except Exception as exc:
            # SDK wraps HTTP errors in its own exceptions; extract the status
            status = getattr(getattr(exc, 'status_code', None), 'value', None)
            if status:
                return self._interpret_response(
                    status_code=int(status),
                    headers={},
                    body=str(exc).encode(),
                    message_id=payload.message_id,
                )
            logger.error('SendGrid SDK error: %s', exc, exc_info=True)
            return ProviderResult(
                success=False,
                provider_name=self.PROVIDER_NAME,
                error_message=str(exc),
                error_code='SDK_ERROR',
            )

    # ------------------------------------------------------------------
    # Send via requests (SDK not installed)
    # ------------------------------------------------------------------

    def _send_via_requests(self, payload: EmailPayload) -> ProviderResult:
        """Send using the plain requests library as fallback."""
        body = self._build_payload_dict(payload)

        try:
            response = requests.post(
                _SENDGRID_SEND_URL,
                json=body,
                headers={
                    'Authorization': f'Bearer {self._api_key}',
                    'Content-Type': 'application/json',
                },
                timeout=30,
            )
            return self._interpret_response(
                status_code=response.status_code,
                headers=dict(response.headers),
                body=response.content,
                message_id=payload.message_id,
            )
        except requests.exceptions.Timeout:
            return ProviderResult(
                success=False,
                provider_name=self.PROVIDER_NAME,
                error_message='SendGrid request timed out.',
                error_code='TIMEOUT',
            )
        except requests.exceptions.ConnectionError as exc:
            return ProviderResult(
                success=False,
                provider_name=self.PROVIDER_NAME,
                error_message=f'SendGrid connection error: {exc}',
                error_code='CONNECTION_ERROR',
            )

    # ------------------------------------------------------------------
    # Response interpretation
    # ------------------------------------------------------------------

    def _interpret_response(
        self,
        status_code: int,
        headers: dict,
        body: bytes,
        message_id: Optional[str],
    ) -> ProviderResult:
        """Translate a raw HTTP response into a ProviderResult."""
        # 2xx = accepted
        if 200 <= status_code < 300:
            # SendGrid returns the Message-ID in the X-Message-Id header
            sg_message_id = headers.get('X-Message-Id', '') or headers.get('x-message-id', '')
            logger.info(
                'SendGrid accepted message (status=%s, sg_message_id=%s)',
                status_code,
                sg_message_id,
            )
            return ProviderResult(
                success=True,
                provider_name=self.PROVIDER_NAME,
                provider_message_id=sg_message_id or message_id or '',
                raw_response={'status_code': status_code},
            )

        body_text = body.decode('utf-8', errors='replace') if isinstance(body, bytes) else str(body)

        if status_code == 429:
            retry_after = int(headers.get('Retry-After', 60))
            logger.warning(
                'SendGrid rate limited (429). Retry-After=%s seconds.', retry_after
            )
            return ProviderResult(
                success=False,
                provider_name=self.PROVIDER_NAME,
                error_message=f'SendGrid rate limited. Retry after {retry_after}s.',
                error_code='RATE_LIMITED',
                raw_response={'status_code': status_code, 'retry_after': retry_after},
            )

        if status_code in (401, 403):
            logger.error('SendGrid authentication failed (status=%s).', status_code)
            return ProviderResult(
                success=False,
                provider_name=self.PROVIDER_NAME,
                error_message='SendGrid authentication failed. Check SENDGRID_API_KEY.',
                error_code='AUTH_FAILED',
                raw_response={'status_code': status_code},
            )

        if status_code in _RETRYABLE_STATUS_CODES:
            logger.warning('SendGrid temporary failure (status=%s).', status_code)
            return ProviderResult(
                success=False,
                provider_name=self.PROVIDER_NAME,
                error_message=f'SendGrid temporary error {status_code}: {body_text[:200]}',
                error_code=f'HTTP_{status_code}',
                raw_response={'status_code': status_code},
            )

        # Anything else (400, 413, etc.) is a permanent failure
        logger.error('SendGrid permanent failure (status=%s): %s', status_code, body_text[:500])
        return ProviderResult(
            success=False,
            provider_name=self.PROVIDER_NAME,
            error_message=f'SendGrid error {status_code}: {body_text[:300]}',
            error_code=f'HTTP_{status_code}',
            raw_response={'status_code': status_code},
        )

    # ------------------------------------------------------------------
    # Payload builder (used by _send_via_requests)
    # ------------------------------------------------------------------

    def _build_payload_dict(self, payload: EmailPayload) -> Dict:
        """Build the SendGrid v3 Mail Send JSON body."""
        from_addr: Dict = {'email': payload.from_email}
        if payload.from_name:
            from_addr['name'] = payload.from_name

        to_addr: Dict = {'email': payload.to_email}
        if payload.to_name:
            to_addr['name'] = payload.to_name

        personalization: Dict = {'to': [to_addr], 'subject': payload.subject}
        if payload.cc:
            personalization['cc'] = [{'email': e} for e in payload.cc]
        if payload.bcc:
            personalization['bcc'] = [{'email': e} for e in payload.bcc]

        body: Dict = {
            'personalizations': [personalization],
            'from': from_addr,
            'content': [],
            'tracking_settings': {
                'open_tracking': {'enable': self._track_opens},
                'click_tracking': {
                    'enable': self._track_clicks,
                    'enable_text': self._track_clicks,
                },
            },
            'mail_settings': {
                'sandbox_mode': {'enable': self._sandbox},
            },
        }

        if payload.reply_to:
            body['reply_to'] = {'email': payload.reply_to}

        if payload.body_text:
            body['content'].append({'type': 'text/plain', 'value': payload.body_text})
        if payload.body_html:
            body['content'].append({'type': 'text/html', 'value': payload.body_html})

        if payload.headers:
            body['headers'] = payload.headers

        categories = payload.extra.get('categories', [])
        if categories:
            body['categories'] = categories[:10]  # SendGrid limit: 10 categories

        return body

    # ------------------------------------------------------------------
    # Webhook signature verification  (used by Phase 6 webhook view)
    # ------------------------------------------------------------------

    def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str,
        timestamp: str,
    ) -> bool:
        """
        Verify a SendGrid Event Webhook ECDSA signature.

        SendGrid signs webhook payloads using ECDSA with a public key
        available in the SendGrid dashboard (Settings → Mail Settings →
        Event Webhook → Signed Event Webhook).

        This method uses the EC public key approach documented at:
        https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook-security-features

        Args:
            payload:    Raw request body bytes.
            signature:  Value of the X-Twilio-Email-Event-Webhook-Signature header.
            timestamp:  Value of the X-Twilio-Email-Event-Webhook-Timestamp header.

        Returns:
            True if the signature is valid, False otherwise.
        """
        self._resolve_config()

        if not self._webhook_secret:
            logger.warning(
                'SendGrid webhook secret not configured '
                '(set SENDGRID_WEBHOOK_SECRET env-var). '
                'Signature verification skipped.'
            )
            return False

        try:
            from ecdsa import VerifyingKey, NIST256p
            import base64

            timestamped_payload = timestamp.encode('utf-8') + payload
            vk = VerifyingKey.from_pem(self._webhook_secret)
            sig_bytes = base64.b64decode(signature)
            return vk.verify(
                sig_bytes,
                timestamped_payload,
                hashfunc=hashlib.sha256,
            )
        except ImportError:
            # ecdsa package not installed — fall back to HMAC-SHA256 for
            # legacy signed webhooks or skip verification in dev
            logger.warning(
                'ecdsa package not installed; using HMAC fallback for webhook verification.'
            )
            return self._verify_hmac_signature(payload, timestamp, signature)
        except Exception as exc:
            logger.error('SendGrid webhook signature verification error: %s', exc)
            return False

    def _verify_hmac_signature(
        self, payload: bytes, timestamp: str, signature: str
    ) -> bool:
        """HMAC-SHA256 fallback for webhook verification (legacy webhooks)."""
        if not self._webhook_secret:
            return False
        import base64
        expected = hmac.new(
            self._webhook_secret.encode(),
            (timestamp.encode() + payload),
            hashlib.sha256,
        ).digest()
        try:
            return hmac.compare_digest(
                base64.b64decode(signature),
                expected,
            )
        except Exception:
            return False
