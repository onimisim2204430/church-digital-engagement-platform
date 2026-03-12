"""Payment system monitoring and alerting infrastructure.

This module provides a flexible alerting system that can integrate with:
- Slack
- Email
- Custom monitoring dashboards
- Log aggregation services
"""

import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from datetime import datetime

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

logger = logging.getLogger('payments')


class AlertSeverity:
    """Alert severity levels."""
    INFO = 'INFO'
    WARNING = 'WARNING'
    ERROR = 'ERROR'
    CRITICAL = 'CRITICAL'


class PaymentAlert:
    """Represents a payment system alert."""
    
    def __init__(
        self,
        severity: str,
        title: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        timestamp: Optional[datetime] = None,
    ):
        self.severity = severity
        self.title = title
        self.message = message
        self.details = details or {}
        self.timestamp = timestamp or timezone.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            'severity': self.severity,
            'title': self.title,
            'message': self.message,
            'details': self.details,
            'timestamp': self.timestamp.isoformat(),
        }


class AlertHandler(ABC):
    """Abstract base class for alert handlers."""
    
    @abstractmethod
    def send_alert(self, alert: PaymentAlert) -> bool:
        """Send an alert via this handler.
        
        Returns:
            True if alert was sent successfully, False otherwise
        """
        pass


class SlackAlertHandler(AlertHandler):
    """Send alerts to Slack."""
    
    def __init__(self, webhook_url: str):
        """Initialize Slack handler.
        
        Args:
            webhook_url: Slack incoming webhook URL
        """
        self.webhook_url = webhook_url
    
    def send_alert(self, alert: PaymentAlert) -> bool:
        """Send alert to Slack."""
        if not self.webhook_url:
            logger.warning('Slack webhook URL not configured')
            return False
        
        try:
            import requests
            
            # Color based on severity
            color_map = {
                AlertSeverity.INFO: '#36a64f',
                AlertSeverity.WARNING: '#ff9900',
                AlertSeverity.ERROR: '#ff6666',
                AlertSeverity.CRITICAL: '#cc0000',
            }
            
            payload = {
                'attachments': [
                    {
                        'color': color_map.get(alert.severity, '#888888'),
                        'title': f"[{alert.severity}] {alert.title}",
                        'text': alert.message,
                        'fields': [
                            {
                                'title': 'Severity',
                                'value': alert.severity,
                                'short': True,
                            },
                            {
                                'title': 'Timestamp',
                                'value': alert.timestamp.isoformat(),
                                'short': True,
                            },
                        ],
                        'footer': 'Church Digital Platform — Payment System',
                        'ts': int(alert.timestamp.timestamp()),
                    }
                ]
            }
            
            # Add details as additional fields if present
            if alert.details:
                fields = payload['attachments'][0]['fields']
                for key, value in list(alert.details.items())[:10]:  # Limit to 10 fields
                    fields.append({
                        'title': str(key),
                        'value': str(value)[:500],  # Slack has field value limits
                        'short': len(str(value)) < 50,
                    })
            
            response = requests.post(
                self.webhook_url,
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                logger.info(f'Alert sent to Slack: {alert.title}')
                return True
            else:
                logger.error(f'Failed to send Slack alert: {response.status_code}')
                return False
                
        except Exception as exc:
            logger.exception('Error sending Slack alert')
            return False


class EmailAlertHandler(AlertHandler):
    """Send alerts via email."""
    
    def __init__(self, recipient_emails: List[str]):
        """Initialize email handler.
        
        Args:
            recipient_emails: List of email addresses to send alerts to
        """
        self.recipient_emails = recipient_emails
    
    def send_alert(self, alert: PaymentAlert) -> bool:
        """Send alert via email."""
        if not self.recipient_emails:
            logger.warning('No email recipients configured for payment alerts')
            return False
        
        try:
            subject = f"[{alert.severity}] Payment System Alert: {alert.title}"
            
            # Format message with details
            message_body = f"""{alert.message}

Severity: {alert.severity}
Timestamp: {alert.timestamp.isoformat()}

Details:
"""
            
            for key, value in alert.details.items():
                message_body += f"  {key}: {value}\n"
            
            message_body += f"""

System: Church Digital Platform — Payment Processing
Please investigate immediately if severity is CRITICAL or ERROR.
"""
            
            send_mail(
                subject=subject,
                message=message_body,
                from_email=settings.DEFAULT_FROM_EMAIL or 'noreply@churchplatform.local',
                recipient_list=self.recipient_emails,
                fail_silently=False,
            )
            
            logger.info(f'Alert email sent: {alert.title}')
            return True
            
        except Exception as exc:
            logger.exception('Error sending email alert')
            return False


class LogAlertHandler(AlertHandler):
    """Log alerts to application logger."""
    
    def send_alert(self, alert: PaymentAlert) -> bool:
        """Log alert at appropriate level."""
        log_method = getattr(logger, alert.severity.lower(), logger.info)
        
        message = f"{alert.title}: {alert.message}"
        if alert.details:
            message += f" | Details: {alert.details}"
        
        log_method(message)
        return True


class AlertManager:
    """Central alert management for payment system.
    
    This class coordinates sending alerts through multiple channels.
    """
    
    def __init__(self):
        """Initialize alert manager with configured handlers."""
        self.handlers: List[AlertHandler] = []
        self._configure_handlers()
    
    def _configure_handlers(self) -> None:
        """Configure alert handlers from Django settings."""
        # Always add logging handler
        self.handlers.append(LogAlertHandler())
        
        # Add Slack handler if webhook URL is configured
        slack_webhook = getattr(settings, 'PAYMENT_ALERTS_SLACK_WEBHOOK', None)
        if slack_webhook:
            self.handlers.append(SlackAlertHandler(slack_webhook))
            logger.info('Slack alert handler configured')
        
        # Add email handler if recipients are configured
        email_recipients = getattr(settings, 'PAYMENT_ALERTS_EMAIL_RECIPIENTS', None)
        if email_recipients:
            self.handlers.append(EmailAlertHandler(email_recipients))
            logger.info(f'Email alert handler configured with {len(email_recipients)} recipients')
    
    def send_alert(
        self,
        severity: str,
        title: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """Send an alert through all configured handlers.
        
        Args:
            severity: Alert severity (INFO, WARNING, ERROR, CRITICAL)
            title: Alert title/subject
            message: Alert message body
            details: Optional dict with additional context
        
        Returns:
            True if at least one handler sent the alert successfully
        """
        alert = PaymentAlert(
            severity=severity,
            title=title,
            message=message,
            details=details,
        )
        
        success_count = 0
        for handler in self.handlers:
            try:
                if handler.send_alert(alert):
                    success_count += 1
            except Exception as exc:
                logger.exception(f'Error in {handler.__class__.__name__}')
        
        return success_count > 0


# Global alert manager instance
_alert_manager: Optional[AlertManager] = None


def get_alert_manager() -> AlertManager:
    """Get or create the global alert manager instance."""
    global _alert_manager
    if _alert_manager is None:
        _alert_manager = AlertManager()
    return _alert_manager


def send_payment_alert(
    severity: str,
    title: str,
    message: str,
    details: Optional[Dict[str, Any]] = None,
) -> bool:
    """Send a payment system alert.
    
    This is the main entry point for sending alerts.
    
    Args:
        severity: Alert severity (INFO, WARNING, ERROR, CRITICAL)
        title: Alert title
        message: Alert message
        details: Optional additional context
    
    Returns:
        True if alert was sent via at least one handler
    
    Examples:
        # Send payment error alert
        send_payment_alert(
            severity=AlertSeverity.CRITICAL,
            title='Payment Gateway Failure',
            message='Paystack API is returning 503 errors',
            details={
                'endpoint': '/transaction/verify',
                'error_count': 5,
                'window': 'last 10 minutes'
            }
        )
        
        # Send security alert
        send_payment_alert(
            severity=AlertSeverity.CRITICAL,
            title='Fraud Detected',
            message='Unusual payment pattern detected',
            details={
                'email': 'attacker@example.com',
                'attempts': 10,
                'timeframe': '5 minutes'
            }
        )
    """
    manager = get_alert_manager()
    return manager.send_alert(severity, title, message, details)
