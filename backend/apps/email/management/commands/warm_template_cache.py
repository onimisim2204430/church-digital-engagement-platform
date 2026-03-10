"""
Management command: warm_template_cache

Pre-loads all active EmailTemplate records into the Redis cache so the
first request for each template hits the cache instead of the database.

Usage
-----
    python manage.py warm_template_cache
    python manage.py warm_template_cache --quiet
    python manage.py warm_template_cache --slug verification

Options
-------
--slug      Warm only the specified template slug instead of all templates.
--quiet     Suppress progress output.
"""

from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Pre-load email templates into Redis cache for faster rendering.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--slug',
            dest='slug',
            default='',
            help='Warm only the template with this slug (default: all active templates).',
        )
        parser.add_argument(
            '--quiet',
            action='store_true',
            dest='quiet',
            default=False,
            help='Suppress output.',
        )

    def handle(self, *args, **options):
        from apps.email.template_engine import TemplateEngine

        slug = options['slug']
        quiet = options['quiet']

        if slug:
            # Warm a single template
            try:
                from apps.email.models import EmailTemplate
                templates = EmailTemplate.objects.filter(slug=slug, is_active=True)
                if not templates.exists():
                    raise CommandError(f'No active template found with slug "{slug}".')

                for tmpl in templates.order_by('-version'):
                    TemplateEngine._get_compiled(
                        slug=tmpl.slug,
                        version=tmpl.version,
                        html_body=tmpl.html_body,
                    )
                    if not quiet:
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'Warmed: {tmpl.slug} (v{tmpl.version})'
                            )
                        )
                count = templates.count()
            except CommandError:
                raise
            except Exception as exc:
                raise CommandError(f'Cache warm failed: {exc}') from exc
        else:
            # Warm all active templates
            try:
                count = TemplateEngine.warm_all()
            except Exception as exc:
                raise CommandError(f'Cache warm failed: {exc}') from exc

        if not quiet:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Template cache warmed: {count} template(s) loaded.'
                )
            )
