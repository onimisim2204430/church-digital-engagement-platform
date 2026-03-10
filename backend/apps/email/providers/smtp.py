"""
SMTP email provider with thread-local connection pooling.

Each OS thread keeps its own SMTP connection open.  Before every send the
connection health is verified; stale connections are recycled transparently.
TLS (STARTTLS) and SSL are both supported via configuration.

Configuration keys (from EMAIL_CONFIG['providers'][n]):
    type                 = "SMTP"
    host                 = hostname or env-var name (default: EMAIL_HOST env)
    port                 = integer or env-var name  (default: EMAIL_PORT env)
    username             = plain value or env-var name
    password_env_var     = name of the env-var that holds the password
                           (NEVER supply the password itself here)
    use_tls              = True / False (STARTTLS on port 587)
    use_ssl              = True / False (SSL on port 465)
    timeout              = connection timeout in seconds (default: 30)
    default_from_email   = override DEFAULT_FROM_EMAIL for this provider
"""

import logging
import os
import smtplib
import socket
import threading
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from django.conf import settings

from .base import AbstractEmailProvider, EmailPayload, ProviderResult

logger = logging.getLogger('email.providers.smtp')

# Thread-local storage for per-thread SMTP connection
_thread_local = threading.local()


class SMTPProvider(AbstractEmailProvider):
    """
    Production SMTP provider with:
    - Thread-local connection pooling (one persistent connection per thread)
    - Automatic reconnection on stale / dropped connections
    - STARTTLS (port 587) and SSL (port 465) support
    - Proper MIME multipart construction (HTML + plain-text)
    - All credentials sourced from environment variables
    """

    PROVIDER_NAME = 'SMTP'

    def __init__(self, config: dict) -> None:
        super().__init__(config)
        self._host: Optional[str] = None
        self._port: Optional[int] = None
        self._username: Optional[str] = None
        self._password: Optional[str] = None
        self._use_tls: bool = True
        self._use_ssl: bool = False
        self._timeout: int = 30
        self._resolved = False

    # ------------------------------------------------------------------
    # Config resolution (lazy, so env-vars are read at send time)
    # ------------------------------------------------------------------

    def _resolve_config(self) -> None:
        """
        Resolve all configuration values from the config dict + environment.
        Called once per provider instance, lazily on the first send.
        """
        if self._resolved:
            return

        cfg = self.config

        # Host
        self._host = (
            cfg.get('host')
            or os.environ.get('EMAIL_HOST')
            or getattr(settings, 'EMAIL_HOST', 'smtp.gmail.com')
        )

        # Port
        port_raw = (
            cfg.get('port')
            or os.environ.get('EMAIL_PORT')
            or getattr(settings, 'EMAIL_PORT', 587)
        )
        self._port = int(port_raw)

        # Username
        self._username = (
            cfg.get('username')
            or os.environ.get('EMAIL_HOST_USER')
            or getattr(settings, 'EMAIL_HOST_USER', '')
        )

        # Password — ONLY from env-var, never from a config value directly
        password_env = cfg.get('password_env_var', 'EMAIL_HOST_PASSWORD')
        self._password = os.environ.get(password_env, '')
        if not self._password:
            # Fallback: check Django setting (which itself should come from env)
            self._password = getattr(settings, 'EMAIL_HOST_PASSWORD', '')

        # TLS / SSL
        self._use_tls = cfg.get(
            'use_tls',
            getattr(settings, 'EMAIL_USE_TLS', True),
        )
        self._use_ssl = cfg.get(
            'use_ssl',
            getattr(settings, 'EMAIL_USE_SSL', False),
        )

        # Timeout
        self._timeout = int(
            cfg.get('timeout', getattr(settings, 'EMAIL_TIMEOUT', 30))
        )

        self._resolved = True

    # ------------------------------------------------------------------
    # Connection management
    # ------------------------------------------------------------------

    def _get_connection(self) -> smtplib.SMTP:
        """
        Return the thread-local SMTP connection, creating or recycling it.

        Recycle conditions:
        - No connection exists yet
        - Connection's NOOP check fails (remote end closed it)
        """
        conn: Optional[smtplib.SMTP] = getattr(_thread_local, 'smtp_connection', None)

        if conn is not None:
            try:
                # NOOP is the standard "are you still there?" probe
                status = conn.noop()
                if status[0] == 250:
                    return conn
            except Exception:
                pass
            # Connection is stale — close cleanly before replacing
            self._close_connection_quietly(conn)
            _thread_local.smtp_connection = None

        return self._create_connection()

    def _create_connection(self) -> smtplib.SMTP:
        """Open a fresh SMTP connection and store it in thread-local storage."""
        self._resolve_config()

        try:
            if self._use_ssl:
                conn = smtplib.SMTP_SSL(self._host, self._port, timeout=self._timeout)
            else:
                conn = smtplib.SMTP(self._host, self._port, timeout=self._timeout)
                if self._use_tls:
                    conn.ehlo()
                    conn.starttls()
                    conn.ehlo()

            if self._username and self._password:
                conn.login(self._username, self._password)

            _thread_local.smtp_connection = conn
            logger.debug('SMTP connection established to %s:%s', self._host, self._port)
            return conn

        except smtplib.SMTPAuthenticationError as exc:
            logger.error('SMTP authentication failed for user "%s": %s', self._username, exc)
            raise
        except (socket.timeout, ConnectionRefusedError, OSError) as exc:
            logger.error('SMTP connection to %s:%s failed: %s', self._host, self._port, exc)
            raise

    @staticmethod
    def _close_connection_quietly(conn: smtplib.SMTP) -> None:
        try:
            conn.quit()
        except Exception:
            try:
                conn.close()
            except Exception:
                pass

    # ------------------------------------------------------------------
    # Message construction
    # ------------------------------------------------------------------

    @staticmethod
    def _build_mime_message(payload: EmailPayload) -> MIMEMultipart:
        """Build a MIME multipart/alternative message from an EmailPayload."""
        from_addr = payload.from_email
        if payload.from_name:
            from_addr = f'{payload.from_name} <{payload.from_email}>'

        to_addr = payload.to_email
        if payload.to_name:
            to_addr = f'{payload.to_name} <{payload.to_email}>'

        msg = MIMEMultipart('alternative')
        msg['Subject'] = payload.subject
        msg['From'] = from_addr
        msg['To'] = to_addr

        if payload.reply_to:
            msg['Reply-To'] = payload.reply_to

        # Inject custom headers (List-Unsubscribe, X-Priority, etc.)
        for header_name, header_value in payload.headers.items():
            msg[header_name] = header_value

        # Plain-text part first (lower priority; mail clients prefer HTML)
        if payload.body_text:
            msg.attach(MIMEText(payload.body_text, 'plain', 'utf-8'))

        # HTML part second (highest priority)
        if payload.body_html:
            msg.attach(MIMEText(payload.body_html, 'html', 'utf-8'))

        return msg

    # ------------------------------------------------------------------
    # AbstractEmailProvider interface
    # ------------------------------------------------------------------

    def send(self, payload: EmailPayload) -> ProviderResult:
        """Send a single email via SMTP with automatic reconnection."""
        self._resolve_config()

        try:
            msg = self._build_mime_message(payload)
            recipients = [payload.to_email] + payload.cc + payload.bcc

            conn = self._get_connection()
            conn.sendmail(payload.from_email, recipients, msg.as_string())

            logger.info(
                'SMTP sent: subject="%s" to="%s"',
                payload.subject,
                payload.to_email,
            )
            return ProviderResult(
                success=True,
                provider_name=self.PROVIDER_NAME,
                # SMTP doesn't give back a provider message ID in standard mode;
                # we use the internal UUID so callers always have *something*
                provider_message_id=payload.message_id or '',
            )

        except smtplib.SMTPRecipientsRefused as exc:
            error = f'All recipients refused: {exc.recipients}'
            logger.warning('SMTP recipients refused for %s: %s', payload.to_email, exc)
            return ProviderResult(
                success=False,
                provider_name=self.PROVIDER_NAME,
                error_message=error,
                error_code='RECIPIENTS_REFUSED',
            )

        except smtplib.SMTPDataError as exc:
            error = f'SMTP data error: {exc.smtp_code} {exc.smtp_error}'
            logger.error('SMTP data error sending to %s: %s', payload.to_email, exc)
            return ProviderResult(
                success=False,
                provider_name=self.PROVIDER_NAME,
                error_message=error,
                error_code='DATA_ERROR',
            )

        except smtplib.SMTPException as exc:
            # Stale connection — drop it so the next call creates a fresh one
            _thread_local.smtp_connection = None
            error = f'SMTP error: {exc}'
            logger.error('SMTP error sending to %s: %s', payload.to_email, exc, exc_info=True)
            return ProviderResult(
                success=False,
                provider_name=self.PROVIDER_NAME,
                error_message=error,
                error_code='SMTP_ERROR',
            )

        except Exception as exc:
            _thread_local.smtp_connection = None
            error = f'Unexpected error: {exc}'
            logger.error(
                'Unexpected error in SMTPProvider.send() for %s: %s',
                payload.to_email,
                exc,
                exc_info=True,
            )
            return ProviderResult(
                success=False,
                provider_name=self.PROVIDER_NAME,
                error_message=error,
                error_code='UNKNOWN',
            )

    def validate_config(self) -> None:
        """Verify that the critical SMTP settings are present."""
        self._resolve_config()

        issues = []
        if not self._host:
            issues.append('EMAIL_HOST is not set')
        if not self._port:
            issues.append('EMAIL_PORT is not set')
        if not self._username:
            issues.append('EMAIL_HOST_USER is not set')
        if not self._password:
            issues.append(
                'SMTP password is not set. '
                'Set the EMAIL_HOST_PASSWORD environment variable.'
            )

        if issues:
            raise ValueError(f'SMTPProvider config error: {"; ".join(issues)}')

    def health_check(self) -> bool:
        """
        Verify the SMTP server is reachable.

        Opens a transient connection (does not reuse the pooled one) to avoid
        interfering with in-flight sends on other threads.
        """
        self._resolve_config()
        try:
            if self._use_ssl:
                conn = smtplib.SMTP_SSL(self._host, self._port, timeout=5)
            else:
                conn = smtplib.SMTP(self._host, self._port, timeout=5)
                if self._use_tls:
                    conn.ehlo()
                    conn.starttls()
                    conn.ehlo()

            conn.quit()
            return True
        except Exception as exc:
            logger.warning('SMTPProvider health check failed: %s', exc)
            return False
