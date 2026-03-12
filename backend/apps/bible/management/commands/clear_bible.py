"""
Clears all Bible data for a translation from the database and cache.

Usage:
  python manage.py clear_bible --translation KJV
  python manage.py clear_bible --translation NIV --keep-translation

Options:
  --translation     Use KJV if not specified
  --keep-translation  Remove only verses, keep Translation record
"""
from django.core.management.base import BaseCommand, CommandError
from django.core.cache import cache
from apps.bible.models import Translation, Verse


class Command(BaseCommand):
    help = "Remove all Bible data for a translation."

    def add_arguments(self, parser):
        parser.add_argument("--translation", type=str, default="KJV",
                            help="Translation code to clear (default: KJV)")
        parser.add_argument("--keep-translation", action="store_true",
                            help="Keep Translation record, delete only Verses")

    def handle(self, *args, **options):
        code = options["translation"].upper()
        keep_tr = options["keep_translation"]

        try:
            translation = Translation.objects.get(code=code)
        except Translation.DoesNotExist:
            raise CommandError(f"Translation '{code}' not found.")

        # Delete verses
        verse_count, _ = Verse.objects.filter(translation=translation).delete()
        self.stdout.write(f"  ✅ Deleted {verse_count} verses for {code}")

        # Delete translation if not keeping it
        if not keep_tr:
            translation.delete()
            self.stdout.write(f"  ✅ Deleted Translation record: {code}")

        # Clear all caches for this translation
        cache.delete(f"full_bible_{code}")
        cache.delete("bible_meta_all")
        cache.delete("bible_translations_list")
        for book_num in range(1, 67):
            for ch in range(1, 151):
                cache.delete(f"chapter_{code}_{book_num}_{ch}")

        self.stdout.write(self.style.SUCCESS(
            f"\n✅ Done! All data cleared for {code}.\n"
            f"   Cache invalidated.\n"
        ))
