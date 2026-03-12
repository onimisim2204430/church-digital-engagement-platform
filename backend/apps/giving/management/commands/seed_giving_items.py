"""
Management command to seed initial giving items.
Run with: python manage.py seed_giving_items
"""

from django.core.management.base import BaseCommand
from apps.giving.models import GivingItem


class Command(BaseCommand):
    help = 'Seed initial giving items based on hardcoded frontend data'

    def handle(self, *args, **options):
        # Clear existing items (optional - remove if you want to keep existing)
        # GivingItem.objects.all().delete()
        
        # Seed items based on original GIVING_OPTIONS from frontend
        items_data = [
            {
                'category': 'tithe',
                'title': 'Weekly Tithe',
                'description': 'Honour God with the first portion of all you receive. Your faithful giving sustains the ministry, staff, and mission of this community.',
                'icon': 'volunteer_activism',
                'visibility': 'public',
                'status': 'active',
                'is_featured': True,
                'is_recurring_enabled': True,
                'suggested_amounts': [5000, 10000, 20000, 50000],  # In kobo (NGN smallest unit)
                'verse': '"Bring the full tithe into the storehouse." — Malachi 3:10',
                'display_order': 1,
            },
            {
                'category': 'offering',
                'title': 'Worship Offering',
                'description': 'A free-will offering given out of gratitude and love — above and beyond the tithe — to support the work of the Spirit among us.',
                'icon': 'favorite',
                'visibility': 'public',
                'status': 'active',
                'is_featured': False,
                'is_recurring_enabled': False,
                'suggested_amounts': [2500, 5000, 10000, 25000],
                'display_order': 2,
            },
            {
                'category': 'offering',
                'title': 'Benevolence Fund',
                'description': 'Support families in crisis within our congregation and surrounding community. Funds go directly to food, rent, and emergency relief.',
                'icon': 'groups',
                'visibility': 'public',
                'status': 'active',
                'is_featured': False,
                'is_recurring_enabled': False,
                'suggested_amounts': [2000, 5000, 10000, 20000],
                'display_order': 3,
            },
            {
                'category': 'project',
                'title': 'New Sanctuary Build',
                'description': 'Help us build a permanent home for our growing congregation. Every gift brings us one step closer to a space designed for worship, community, and rest.',
                'icon': 'church',
                'visibility': 'public',
                'status': 'active',
                'is_featured': True,
                'is_recurring_enabled': False,
                'suggested_amounts': [],
                'goal_amount': 25000000,  # 250,000 NGN in kobo
                'raised_amount': 16340000,  # 163,400 NGN
                'deadline': '2025-12-31',
                'display_order': 4,
            },
            {
                'category': 'project',
                'title': 'Media & Technology',
                'description': 'Fund professional audio-visual equipment, live streaming infrastructure, and digital tools to reach more people online.',
                'icon': 'cast',
                'visibility': 'public',
                'status': 'active',
                'is_featured': False,
                'is_recurring_enabled': False,
                'suggested_amounts': [],
                'goal_amount': 3500000,  # 35,000 NGN
                'raised_amount': 2180000,  # 21,800 NGN
                'deadline': '2025-03-31',
                'display_order': 5,
            },
            {
                'category': 'mission',
                'title': 'Missions & Outreach',
                'description': 'Partner with missionaries and support community outreach programs both locally and globally. Every gift helps expand the Kingdom.',
                'icon': 'public',
                'visibility': 'public',
                'status': 'active',
                'is_featured': False,
                'is_recurring_enabled': True,
                'suggested_amounts': [5000, 10000, 25000, 50000],
                'display_order': 6,
            },
            {
                'category': 'other',
                'title': 'Youth & Children Ministry',
                'description': 'Invest in the next generation. Support camps, programs, resources, and events that disciple young people in their walk with Christ.',
                'icon': 'family_restroom',
                'visibility': 'public',
                'status': 'active',
                'is_featured': False,
                'is_recurring_enabled': False,
                'suggested_amounts': [3000, 5000, 10000, 15000],
                'display_order': 7,
            },
        ]

        created_count = 0
        for item_data in items_data:
            item, created = GivingItem.objects.get_or_create(
                title=item_data['title'],
                defaults=item_data
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'✓ Created: {item.title}'))
            else:
                self.stdout.write(self.style.WARNING(f'○ Exists: {item.title}'))

        self.stdout.write(self.style.SUCCESS(f'\n{created_count} new items created, {len(items_data) - created_count} already existed.'))
