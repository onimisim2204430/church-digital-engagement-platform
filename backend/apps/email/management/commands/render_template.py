"""
Management command: render_template

CLI preview tool for email templates.  Renders a template with optional
context and outputs the result to stdout or a file.

Usage
-----
    # Preview HTML in terminal
    python manage.py render_template verification

    # Preview with custom context
    python manage.py render_template verification --context '{"user_name": "Alice", "verification_url": "https://example.com/verify/abc"}'

    # Save to HTML file
    python manage.py render_template verification --output /tmp/preview.html

    # Render for a specific user
    python manage.py render_template notification --user 42

    # Show text version only
    python manage.py render_template welcome --text-only

    # Show subject only
    python manage.py render_template welcome --subject-only
"""

import json

from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Render an email template and print or save the output.'

    def add_arguments(self, parser):
        parser.add_argument(
            'slug',
            help='The template slug to render.',
        )
        parser.add_argument(
            '--context',
            dest='context',
            default='{}',
            help='JSON context variables to pass to the template.',
        )
        parser.add_argument(
            '--user',
            dest='user_id',
            type=int,
            default=None,
            help='User ID to inject into template context.',
        )
        parser.add_argument(
            '--email',
            dest='email',
            default='preview@example.com',
            help='Recipient email for context building (default: preview@example.com).',
        )
        parser.add_argument(
            '--output',
            dest='output',
            default='',
            help='Save rendered HTML to this file path (stdout if omitted).',
        )
        parser.add_argument(
            '--text-only',
            action='store_true',
            dest='text_only',
            default=False,
            help='Output plain-text version instead of HTML.',
        )
        parser.add_argument(
            '--subject-only',
            action='store_true',
            dest='subject_only',
            default=False,
            help='Output only the rendered subject line.',
        )

    def handle(self, *args, **options):
        slug = options['slug']
        email = options['email']
        output_path = options['output']
        text_only = options['text_only']
        subject_only = options['subject_only']

        # Parse context JSON
        try:
            context = json.loads(options['context'])
        except json.JSONDecodeError as exc:
            raise CommandError(f'Invalid --context JSON: {exc}') from exc

        # Resolve user if provided
        user = None
        if options['user_id'] is not None:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                user = User.objects.get(pk=options['user_id'])
            except User.DoesNotExist:
                raise CommandError(f'User with id={options["user_id"]} not found.')

        # Render
        from apps.email.template_engine import TemplateEngine, TemplateNotFound
        try:
            subject, html_body, text_body = TemplateEngine.render(
                template_slug=slug,
                context=context,
                user=user,
                email=email,
            )
        except TemplateNotFound as exc:
            raise CommandError(f'Template not found: {exc}') from exc
        except Exception as exc:
            raise CommandError(f'Render error: {exc}') from exc

        # Output
        if subject_only:
            self.stdout.write(subject)
            return

        if text_only:
            output = text_body
        else:
            output = html_body

        if output_path:
            try:
                with open(output_path, 'w', encoding='utf-8') as fh:
                    fh.write(output)
                self.stdout.write(self.style.SUCCESS(f'Saved to: {output_path}'))
            except OSError as exc:
                raise CommandError(f'Could not write to {output_path}: {exc}') from exc
        else:
            # Print a header then the content
            separator = '-' * 60
            self.stdout.write(f'\n{separator}')
            self.stdout.write(f'Template : {slug}')
            self.stdout.write(f'Subject  : {subject}')
            self.stdout.write(separator)
            self.stdout.write(output)
