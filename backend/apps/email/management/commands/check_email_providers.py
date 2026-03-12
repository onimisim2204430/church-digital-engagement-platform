"""
Management command: check_email_providers

Usage:
    python manage.py check_email_providers
    python manage.py check_email_providers --test-email=user@example.com
    python manage.py check_email_providers --json

Outputs the health status of all configured email providers and optionally
sends a test email to verify end-to-end delivery.
"""

import json
import sys

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone


class Command(BaseCommand):
    help = 'Check health of all configured email providers'

    def add_arguments(self, parser):
        parser.add_argument(
            '--test-email',
            metavar='EMAIL',
            default='',
            help='Send a test email to this address to verify end-to-end delivery.',
        )
        parser.add_argument(
            '--json',
            action='store_true',
            dest='output_json',
            help='Output results as JSON (useful for monitoring scripts).',
        )
        parser.add_argument(
            '--force-health-check',
            action='store_true',
            help='Bypass the Redis cache and run a live health check on each provider.',
        )

    def handle(self, *args, **options):
        from apps.email.providers import provider_registry

        self.stdout.write('\n' + self.style.MIGRATE_HEADING('Email Provider Status Check'))
        self.stdout.write(f'Timestamp: {timezone.now().isoformat()}\n')

        # ------------------------------------------------------------------
        # Run health checks
        # ------------------------------------------------------------------
        if options['force_health_check']:
            self.stdout.write('Running live health checks (bypassing cache)...\n')
            raw_results = provider_registry.run_health_checks()
        else:
            raw_results = None  # Will use cached status below

        status_list = provider_registry.get_status()

        if options['force_health_check'] and raw_results:
            # Merge live health-check results into the status list
            live_map = {name: ok for name, ok in raw_results}
            for entry in status_list:
                pname = entry['provider']
                if pname in live_map:
                    entry['live_healthy'] = live_map[pname]

        # ------------------------------------------------------------------
        # Display results
        # ------------------------------------------------------------------
        if options['output_json']:
            self.stdout.write(json.dumps(status_list, indent=2, default=str))
            self._check_all_down(status_list)
            return

        any_issues = False
        for entry in status_list:
            pname = entry['provider']
            circuit_open = entry['circuit_open']
            failures = entry['failure_count']
            cached_healthy = entry.get('cached_healthy')
            live_healthy = entry.get('live_healthy')

            if circuit_open:
                status_str = self.style.ERROR('CIRCUIT OPEN (degraded)')
                any_issues = True
            elif live_healthy is False:
                status_str = self.style.WARNING('UNHEALTHY (live check failed)')
                any_issues = True
            elif cached_healthy is False:
                status_str = self.style.WARNING('POSSIBLY UNHEALTHY (cached)')
                any_issues = True
            else:
                status_str = self.style.SUCCESS('OK')

            self.stdout.write(f'  [{pname}] {status_str}')
            self.stdout.write(
                f'    circuit_open={circuit_open}  '
                f'failures={failures}  '
                f'cached_healthy={cached_healthy}'
            )
            if 'live_healthy' in entry:
                self.stdout.write(f'    live_healthy={entry["live_healthy"]}')

        if not any_issues:
            self.stdout.write('\n' + self.style.SUCCESS('All providers are healthy.'))
        else:
            self.stdout.write(
                '\n' + self.style.WARNING('One or more providers have issues. See above.')
            )

        # ------------------------------------------------------------------
        # Optional test send
        # ------------------------------------------------------------------
        test_email = options['test_email']
        if test_email:
            self._run_test_send(test_email)

    def _run_test_send(self, email: str):
        """Send a test email synchronously and report the result."""
        from apps.email.services import EmailService
        from apps.email.constants import EmailType, EmailPriority

        self.stdout.write(f'\nSending test email to {email} ...')

        try:
            message = EmailService.send_email(
                to_email=email,
                subject='[Email Service] Provider Health Test',
                body_html=(
                    '<h2>Email Provider Health Check</h2>'
                    '<p>This is an automated test email sent by the '
                    '<code>check_email_providers</code> management command.</p>'
                    f'<p>Sent at: {timezone.now().isoformat()}</p>'
                ),
                body_text=(
                    'Email Provider Health Check\n\n'
                    'This is an automated test email sent by the '
                    'check_email_providers management command.\n\n'
                    f'Sent at: {timezone.now().isoformat()}'
                ),
                email_type=EmailType.NOTIFICATION,
                priority=EmailPriority.HIGH,
                async_send=False,  # Send synchronously so we see the result immediately
                metadata={'source': 'check_email_providers_command'},
            )
        except Exception as exc:
            raise CommandError(f'Test send raised an exception: {exc}') from exc

        if message.status == 'SENT':
            self.stdout.write(
                self.style.SUCCESS(
                    f'  Test email SENT successfully via {message.provider_used}.'
                )
            )
        else:
            self.stdout.write(
                self.style.ERROR(
                    f'  Test email FAILED (status={message.status}): {message.error_message}'
                )
            )
            sys.exit(1)

    def _check_all_down(self, status_list):
        if all(e['circuit_open'] for e in status_list):
            sys.exit(2)
