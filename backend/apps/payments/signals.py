"""Signals for post-payment events."""

import logging
from typing import Any

from django.conf import settings
from django.dispatch import Signal, receiver

logger = logging.getLogger('payments')

payment_successful = Signal()


def dispatch_payment_success(*, payment_transaction: Any, verification_data: dict, source: str) -> None:
    """Emit payment success signal safely without breaking request flow."""
    try:
        payment_successful.send(
            sender=payment_transaction.__class__,
            payment_transaction=payment_transaction,
            verification_data=verification_data,
            source=source,
        )
    except Exception:
        logger.exception(
            'Failed to dispatch payment_successful signal',
            extra={'reference': getattr(payment_transaction, 'reference', None), 'source': source},
        )


@receiver(payment_successful)
def log_payment_success(sender: Any, **kwargs: Any) -> None:
    """Default receiver that logs successful payment events."""
    payment_transaction = kwargs.get('payment_transaction')
    source = kwargs.get('source', 'unknown')
    logger.info(
        'Payment success signal emitted',
        extra={
            'reference': getattr(payment_transaction, 'reference', None),
            'source': source,
            'status': getattr(payment_transaction, 'status', None),
        },
    )


@receiver(payment_successful)
def notify_payment_success(sender: Any, **kwargs: Any) -> None:
    """
    Create a notification when payment succeeds.
    
    Sends notification to the user via:
    1. Database (always saved)
    2. WebSocket (real-time, fail-safe)
    
    This receiver is fail-safe - errors are logged but don't crash the payment flow.
    """
    try:
        from django.utils import timezone
        from apps.notifications.services import NotificationService
        from apps.notifications.constants import NotificationType, NotificationPriority, SourceModule
        from apps.email.services import EmailService
        from apps.email.constants import EmailType

        payment_transaction = kwargs.get('payment_transaction')
        if not payment_transaction:
            logger.warning('notify_payment_success called without payment_transaction')
            return

        user = getattr(payment_transaction, 'user', None)

        # Get payment details
        amount = getattr(payment_transaction, 'amount', 0)
        currency = getattr(payment_transaction, 'currency', 'NGN')
        reference = getattr(payment_transaction, 'reference', 'Unknown')
        payment_time = (
            getattr(payment_transaction, 'paid_at', None)
            or getattr(payment_transaction, 'created_at', None)
            or timezone.now()
        )

        # Format amount for display
        amount_major = amount / 100  # Convert from kobo/cents to major unit
        formatted_amount = f"{currency} {amount_major:,.2f}"

        # Create notification (in-app + websocket)
        if user:
            notification = NotificationService.notify_user(
                user=user,
                notification_type=NotificationType.PAYMENT_SUCCESS,
                title='Payment Successful',
                message=f'Your payment of {formatted_amount} has been successfully processed.',
                metadata={
                    'payment_id': str(payment_transaction.id),
                    'reference': reference,
                    'amount': amount,
                    'currency': currency,
                    'formatted_amount': formatted_amount,
                },
                priority=NotificationPriority.MEDIUM,
                source_module=SourceModule.PAYMENT,
            )

            if notification:
                logger.info(
                    'Payment success notification created',
                    extra={
                        'user_id': str(user.id),
                        'reference': reference,
                        'notification_id': str(notification.id),
                    }
                )
            else:
                logger.warning(
                    'Payment success notification creation returned None',
                    extra={'user_id': str(user.id), 'reference': reference}
                )

        # Notify all ADMIN users + finance moderators about incoming payment
        try:
            from apps.notifications.tasks import notify_admin_group_task
            payer_name = getattr(user, 'get_full_name', lambda: None)() or getattr(user, 'email', 'Someone') or 'Someone'
            notify_admin_group_task.delay(
                notification_type=NotificationType.PAYMENT_SUCCESS,
                title=f'Payment received — {formatted_amount}',
                message=f'{payer_name} paid {formatted_amount}. Ref: {reference}.',
                metadata={
                    'payment_id': str(payment_transaction.id),
                    'reference': reference,
                    'amount': amount,
                    'currency': currency,
                    'formatted_amount': formatted_amount,
                    'payer_email': getattr(user, 'email', ''),
                },
                source_module=SourceModule.PAYMENT,
                priority=NotificationPriority.HIGH,
            )
        except Exception:
            logger.exception('Failed to enqueue admin payment notification', extra={'reference': reference})

        # Send transactional payment receipt email using the dedicated template (fail-safe)
        try:
            recipient_email = getattr(payment_transaction, 'email', None) or (getattr(user, 'email', None) if user else None)
            if not recipient_email:
                logger.warning(
                    'Payment receipt email skipped: no recipient email found',
                    extra={'reference': reference, 'user_id': str(getattr(user, "id", None))},
                )
                return

            # Pull giving context from payment metadata
            meta_dict = getattr(payment_transaction, 'metadata', {}) or {}
            giving_category = (meta_dict.get('giving_category') or '').lower().strip()
            giving_title = meta_dict.get('giving_option_title') or ''

            # Friendly payment method label
            _method_labels = {
                'card': 'Card',
                'bank': 'Bank Transfer',
                'bank_transfer': 'Bank Transfer',
                'ussd': 'USSD',
                'qr': 'QR Code',
                'mobile_money': 'Mobile Money',
            }
            raw_method = str(getattr(payment_transaction, 'payment_method', '') or '').lower()
            payment_method_display = _method_labels.get(raw_method, raw_method.replace('_', ' ').title() or '—')

            # Format payment date in a human-readable way
            from django.utils.formats import date_format as dj_date_format
            payment_date_display = payment_time.strftime('%-d %B %Y, %-I:%M %p').lstrip('0') if hasattr(payment_time, 'strftime') else str(payment_time)

            # Category-aware copy
            _copy = {
                'tithe': {
                    'subject': f'Your tithe has been received — {site_name}',
                    'heading': 'Your Tithe Has Been Received',
                    'intro': (
                        'We have received your tithe and give God thanks for your '
                        'faithfulness. Tithing is not merely a transaction — it is an act '
                        'of trust and worship, declaring that God is Lord over all that '
                        'you have. May He open the windows of heaven over your life.'
                    ),
                    'scripture': (
                        'Bring the whole tithe into the storehouse, that there may be food '
                        'in my house. Test me in this, says the Lord Almighty, and see if I '
                        'will not throw open the floodgates of heaven and pour out so much '
                        'blessing that there will not be room enough to store it.'
                    ),
                    'scripture_ref': 'Malachi 3 : 10',
                    'closing': (
                        'We are praying with you and believing God for His faithfulness to '
                        'be evident in every area of your life. Thank you for honouring Him.'
                    ),
                },
                'seed': {
                    'subject': f'Your seed offering has been received — {site_name}',
                    'heading': 'Your Seed Has Been Sown',
                    'intro': (
                        'Your seed offering has been received. Every seed sown in faith '
                        'carries the promise of a harvest. We believe God honours the '
                        'posture of your heart and that what you have planted will '
                        'multiply in His perfect season.'
                    ),
                    'scripture': (
                        'Whoever sows sparingly will also reap sparingly, and whoever '
                        'sows generously will also reap generously. God loves a cheerful giver.'
                    ),
                    'scripture_ref': '2 Corinthians 9 : 6 – 7',
                    'closing': (
                        'May the Lord who multiplies seed return a harvest of blessing, '
                        'provision, and grace into your life — pressed down, shaken '
                        'together, and running over.'
                    ),
                },
                'mission': {
                    'subject': f'Mission giving confirmed — {site_name}',
                    'heading': 'Thank You for Supporting Our Mission',
                    'intro': (
                        'Your gift toward our mission work has been received with great '
                        'gratitude. Because of generosity like yours, the Gospel continues '
                        'to reach people who have never heard it. You are a partner in '
                        'something eternal.'
                    ),
                    'scripture': (
                        'How beautiful are the feet of those who bring good news!'
                    ),
                    'scripture_ref': 'Romans 10 : 15',
                    'closing': (
                        'Thank you for saying yes to being part of the mission. '
                        'Your faithfulness is making a difference far beyond what eyes can see.'
                    ),
                },
                'project': {
                    'subject': f'Project giving confirmed — {site_name}',
                    'heading': 'Your Contribution Has Been Received',
                    'intro': (
                        'We have received your contribution to this project and are deeply '
                        'grateful. Your generosity is helping build something that will '
                        'serve this community for years to come.'
                    ),
                    'scripture': (
                        'Unless the Lord builds the house, the builders labour in vain.'
                    ),
                    'scripture_ref': 'Psalm 127 : 1',
                    'closing': (
                        'Thank you for investing in this vision. Together, we are building '
                        'something that brings glory to God and blessing to many.'
                    ),
                },
            }

            # Fallback for offering / other / general payments
            _default_copy = {
                'subject': f'Giving receipt — {formatted_amount} | {site_name}',
                'heading': 'Thank You for Your Generosity',
                'intro': (
                    'Your gift has been received and we are truly grateful. '
                    'Every act of generosity, however small, reflects a heart '
                    'turned toward God and toward others. Thank you for being '
                    'part of this community of faith.'
                ),
                'scripture': (
                    'Each of you should give what you have decided in your heart '
                    'to give, not reluctantly or under compulsion, for God loves '
                    'a cheerful giver.'
                ),
                'scripture_ref': '2 Corinthians 9 : 7',
                'closing': (
                    'Your faithfulness and generosity make a real difference. '
                    'If you have any questions about your giving, please do not '
                    'hesitate to reach out to us.'
                ),
            }

            copy = _copy.get(giving_category, _default_copy)
            site_name = getattr(settings, 'SITE_NAME', 'Serene Sanctuary')

            # Render template first to control subject/content, then send with raw bodies
            from apps.email.template_engine import TemplateEngine
            subject_tpl, html_body, text_body = TemplateEngine.render(
                template_slug='transactional',
                context={
                    'user_name': getattr(user, 'get_full_name', lambda: None)() or getattr(user, 'email', '') or recipient_email,
                    'giving_title': giving_title,
                    'giving_category': giving_category,
                    'amount': formatted_amount,
                    'date': payment_date_display,
                    'payment_method': payment_method_display,
                    'reference': reference,
                    'email_heading': copy['heading'],
                    'email_intro': copy['intro'],
                    'email_scripture': copy['scripture'],
                    'scripture_ref': copy['scripture_ref'],
                    'email_closing': copy['closing'],
                    'preheader_text': f"Your giving receipt from {site_name}",
                    'action_url': getattr(settings, 'FRONTEND_MEMBER_DASHBOARD_URL', '') or '',
                    'support_email': getattr(settings, 'SUPPORT_EMAIL', getattr(settings, 'DEFAULT_FROM_EMAIL', '')),
                },
                email_type=EmailType.TRANSACTIONAL,
                user=user if user else None,
                email=recipient_email,
            )
            subject = copy['subject']

            EmailService.send_email(
                to_email=recipient_email,
                subject=subject,
                body_html=html_body,
                body_text=text_body,
                email_type=EmailType.TRANSACTIONAL,
                metadata={
                    'payment_id': str(payment_transaction.id),
                    'reference': reference,
                    'amount': amount,
                    'currency': currency,
                },
                user=user if user else None,
                async_send=False,  # send immediately; avoid queue/db mismatch for receipts
            )
        except Exception:
            logger.exception(
                'Payment success email failed (non-blocking)',
                extra={
                    'user_id': str(getattr(user, 'id', None)),
                    'reference': reference,
                    'recipient_email': recipient_email if 'recipient_email' in locals() else None,
                },
            )

    except Exception:
        # Fail-safe: Log error but don't break payment flow
        logger.exception(
            'Failed to handle payment success side-effects',
            extra={
                'reference': getattr(kwargs.get('payment_transaction'), 'reference', None),
                'user_id': str(getattr(kwargs.get('payment_transaction'), 'user', {}).id) if hasattr(kwargs.get('payment_transaction'), 'user') else None,
            }
        )
