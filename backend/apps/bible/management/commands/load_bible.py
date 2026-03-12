"""
Loads Bible data from a local JSON file into the database.

Usage:
  python manage.py load_bible                          # Load KJV from default path
  python manage.py load_bible --translation NIV --source /path/to/niv.json

The JSON file must follow this structure:
  {
    "Genesis": {
      "1": ["In the beginning...", "And the earth..."],
      ...
    },
    ...
  }

Free KJV source: https://github.com/aruljohn/Bible-kjv
Download kjv.json and place in backend/data/kjv.json
"""
import json
import time
from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from django.core.cache import cache
from apps.bible.models import Translation, Book, Verse

BOOK_METADATA = [
    (1,  "Genesis",        "Gen",   "OT", 50),
    (2,  "Exodus",         "Exod",  "OT", 40),
    (3,  "Leviticus",      "Lev",   "OT", 27),
    (4,  "Numbers",        "Num",   "OT", 36),
    (5,  "Deuteronomy",    "Deut",  "OT", 34),
    (6,  "Joshua",         "Josh",  "OT", 24),
    (7,  "Judges",         "Judg",  "OT", 21),
    (8,  "Ruth",           "Ruth",  "OT", 4),
    (9,  "1 Samuel",       "1Sam",  "OT", 31),
    (10, "2 Samuel",       "2Sam",  "OT", 24),
    (11, "1 Kings",        "1Kgs",  "OT", 22),
    (12, "2 Kings",        "2Kgs",  "OT", 25),
    (13, "1 Chronicles",   "1Chr",  "OT", 29),
    (14, "2 Chronicles",   "2Chr",  "OT", 36),
    (15, "Ezra",           "Ezra",  "OT", 10),
    (16, "Nehemiah",       "Neh",   "OT", 13),
    (17, "Esther",         "Esth",  "OT", 10),
    (18, "Job",            "Job",   "OT", 42),
    (19, "Psalms",         "Ps",    "OT", 150),
    (20, "Proverbs",       "Prov",  "OT", 31),
    (21, "Ecclesiastes",   "Eccl",  "OT", 12),
    (22, "Song of Solomon","Song",  "OT", 8),
    (23, "Isaiah",         "Isa",   "OT", 66),
    (24, "Jeremiah",       "Jer",   "OT", 52),
    (25, "Lamentations",   "Lam",   "OT", 5),
    (26, "Ezekiel",        "Ezek",  "OT", 48),
    (27, "Daniel",         "Dan",   "OT", 12),
    (28, "Hosea",          "Hos",   "OT", 14),
    (29, "Joel",           "Joel",  "OT", 3),
    (30, "Amos",           "Amos",  "OT", 9),
    (31, "Obadiah",        "Obad",  "OT", 1),
    (32, "Jonah",          "Jonah", "OT", 4),
    (33, "Micah",          "Mic",   "OT", 7),
    (34, "Nahum",          "Nah",   "OT", 3),
    (35, "Habakkuk",       "Hab",   "OT", 3),
    (36, "Zephaniah",      "Zeph",  "OT", 3),
    (37, "Haggai",         "Hag",   "OT", 2),
    (38, "Zechariah",      "Zech",  "OT", 14),
    (39, "Malachi",        "Mal",   "OT", 4),
    (40, "Matthew",        "Matt",  "NT", 28),
    (41, "Mark",           "Mark",  "NT", 16),
    (42, "Luke",           "Luke",  "NT", 24),
    (43, "John",           "John",  "NT", 21),
    (44, "Acts",           "Acts",  "NT", 28),
    (45, "Romans",         "Rom",   "NT", 16),
    (46, "1 Corinthians",  "1Cor",  "NT", 16),
    (47, "2 Corinthians",  "2Cor",  "NT", 13),
    (48, "Galatians",      "Gal",   "NT", 6),
    (49, "Ephesians",      "Eph",   "NT", 6),
    (50, "Philippians",    "Phil",  "NT", 4),
    (51, "Colossians",     "Col",   "NT", 4),
    (52, "1 Thessalonians","1Thess","NT", 5),
    (53, "2 Thessalonians","2Thess","NT", 3),
    (54, "1 Timothy",      "1Tim",  "NT", 6),
    (55, "2 Timothy",      "2Tim",  "NT", 4),
    (56, "Titus",          "Titus", "NT", 3),
    (57, "Philemon",       "Phlm",  "NT", 1),
    (58, "Hebrews",        "Heb",   "NT", 13),
    (59, "James",          "Jas",   "NT", 5),
    (60, "1 Peter",        "1Pet",  "NT", 5),
    (61, "2 Peter",        "2Pet",  "NT", 3),
    (62, "1 John",         "1John", "NT", 5),
    (63, "2 John",         "2John", "NT", 1),
    (64, "3 John",         "3John", "NT", 1),
    (65, "Jude",           "Jude",  "NT", 1),
    (66, "Revelation",     "Rev",   "NT", 22),
]


class Command(BaseCommand):
    help = "Load Bible translation data from a JSON file into the database."

    def add_arguments(self, parser):
        parser.add_argument("--translation", type=str, default="KJV",
                            help="Translation code (default: KJV)")
        parser.add_argument("--source", type=str,
                            default="data/kjv.json",
                            help="Path to source JSON file (default: data/kjv.json)")
        parser.add_argument("--name", type=str, default="King James Version",
                            help="Full translation name")
        parser.add_argument("--language", type=str, default="English",
                            help="Language name")

    def handle(self, *args, **options):
        start = time.time()
        code     = options["translation"].upper()
        source   = Path(options["source"])
        tr_name  = options["name"]
        language = options["language"]

        if not source.exists():
            raise CommandError(f"Source file not found: {source}\n"
                               f"Download KJV from: https://github.com/aruljohn/Bible-kjv")

        self.stdout.write(f"\n📖 Loading {code} — {tr_name}")
        self.stdout.write(f"   Source: {source}")

        with open(source, "r", encoding="utf-8") as f:
            raw_data = json.load(f)

        translation, created = Translation.objects.get_or_create(
            code=code,
            defaults={"name": tr_name, "language": language}
        )
        action = "Created" if created else "Updated"
        self.stdout.write(f"   {action} translation record: {code}\n")

        total_verses = 0

        for book_num, book_name, abbr, testament, ch_count in BOOK_METADATA:
            if book_name not in raw_data:
                self.stdout.write(f"  ⚠️  Skipping {book_name} — not found in source")
                continue

            book, _ = Book.objects.update_or_create(
                translation=translation,
                number=book_num,
                defaults={
                    "name":          book_name,
                    "abbreviation":  abbr,
                    "testament":     testament,
                    "chapter_count": ch_count,
                }
            )

            book_data = raw_data[book_name]
            verses_to_create = []

            for ch_key, chapter_verses in book_data.items():
                ch_num = int(ch_key)
                if isinstance(chapter_verses, list):
                    for v_idx, verse_text in enumerate(chapter_verses, 1):
                        verses_to_create.append(Verse(
                            translation=translation,
                            book=book,
                            book_number=book_num,
                            chapter=ch_num,
                            verse=v_idx,
                            text=verse_text.strip(),
                        ))
                elif isinstance(chapter_verses, dict):
                    for v_key, verse_text in chapter_verses.items():
                        verses_to_create.append(Verse(
                            translation=translation,
                            book=book,
                            book_number=book_num,
                            chapter=ch_num,
                            verse=int(v_key),
                            text=verse_text.strip(),
                        ))

            Verse.objects.bulk_create(
                verses_to_create,
                batch_size=500,
                ignore_conflicts=True,
            )
            total_verses += len(verses_to_create)
            self.stdout.write(f"  ✅ {book_name}: {len(verses_to_create)} verses loaded")

        # Clear all cached data for this translation so fresh data is served
        cache.delete(f"full_bible_{code}")
        cache.delete("bible_meta_all")
        cache.delete("bible_translations_list")
        for book_num in range(1, 67):
            for ch in range(1, 151):
                cache.delete(f"chapter_{code}_{book_num}_{ch}")

        elapsed = round(time.time() - start, 2)
        self.stdout.write(self.style.SUCCESS(
            f"\n✅ Done! {total_verses} verses loaded for {code} in {elapsed}s\n"
            f"   Redis cache cleared for translation: {code}\n"
        ))
