# 📖 BIBLE MODULE — FULL ENGINEERING SPECIFICATION
### Issued by: Lead Engineer | Version: 1.0 | Status: **BINDING**

---

> **⚠️ ACCOUNTABILITY NOTICE — READ BEFORE TOUCHING ANY FILE**
>
> This document is the single source of truth for building the Bible Module.
> Every requirement herein is **NON-NEGOTIABLE** unless escalated in writing to the Lead Engineer.
> Copilot, Cursor, or any AI assistant generating stub functions, `TODO` placeholders,
> incomplete logic, or deviating from this structure will have its output **rejected in full**.
> The implementing developer is accountable for every line of code produced — AI-assisted or not.

---

## 📋 Project Metadata

| Field | Value |
|---|---|
| Project | Existing Web Application (Django + React) |
| Module Name | `bible` |
| Spec Version | 1.0 — FINAL |
| Issued By | Lead Engineer |
| Status | BINDING — No deviations permitted |
| Backend Stack | Django 4.x + Django REST Framework + Redis |
| Frontend Stack | React 18.x + React Query v5 + idb |
| Network Requirement | Internet required **ONCE only** (first load). **ZERO after.** |
| Isolation Level | Complete — module can be removed without affecting any other feature |

---

## 🔴 THE 5 NON-NEGOTIABLE RULES

Read these first. Violating any one of them = full rework.

```
RULE 1 — ISOLATION
  The Bible module lives in its own directory.
  It does NOT import from, depend on, or modify any existing app code.

RULE 2 — OFFLINE FIRST
  After the first-ever internet connection, the entire Bible must be
  readable, searchable, and navigable with ZERO network requests.
  No exceptions. Not even one.

RULE 3 — FAULT TOLERANCE
  If the Bible module crashes, the rest of the application keeps running.
  An ErrorBoundary wraps the BibleProvider. Mandatory.

RULE 4 — NO HARDCODED VERSES
  No verse text is written as a static string anywhere in the codebase.
  Every verse rendered must come through the Bible module's hooks/components.

RULE 5 — NO STUBS, NO TODOS, NO LAZY CODE
  Every function listed in this spec must be fully implemented.
  If Copilot generates a stub or a TODO comment inside functional code,
  delete it and implement the function properly.
```

---

## 1. WHAT WE ARE BUILDING

The Bible Module is a **complete, self-contained system** that:

- Downloads the entire Bible (~31,102 verses, 66 books, 1,189 chapters) from the backend **on first visit only**
- Stores it permanently in the user's browser using **IndexedDB** (a real database built into every browser, not localStorage)
- Serves all subsequent reads **100% locally** — no server, no network, no latency, no loading spinner
- Exposes a clean React hook API (`useVerse`, `useChapter`, `useBooks`, `useVerseSearch`) usable from **any component anywhere in the app**
- Supports **multiple translations and multiple languages** (KJV, NIV, Yoruba, French Louis Segond, etc.)
- Provides a **BibleEditor** panel so editors can browse, search, and insert verses into content
- Provides a **BibleReader** for public readers to navigate books and chapters
- Replaces **all hardcoded Bible text** in the existing app with live, dynamic verse components
- Works as a **PWA** — the app and Bible data survive hard refresh, browser restart, and complete network loss

### 1.1 Data Scale — Understand This Before Writing Code

| Metric | Value | Implication |
|---|---|---|
| Total verses | ~31,102 | All stored in IndexedDB |
| Total books | 66 | Indexed by book number |
| Total chapters | 1,189 | Fetched as structured JSON |
| Raw JSON (1 translation) | ~4.5 MB | Smaller than most homepage images |
| Gzipped size | ~1.2 MB | Django compresses this automatically |
| IndexedDB storage limit | ~500MB–1GB per origin | We use <5MB. No quota issues. |
| Read speed from IndexedDB | < 5ms | Faster than any API call ever |
| Data mutability | **NEVER changes** | Cache forever. No invalidation needed. |

---

## 2. DIRECTORY STRUCTURE — EXACT, DO NOT DEVIATE

### 2.1 Backend (Django)

```
backend/
  apps/
    bible/                          ← NEW Django app (completely isolated)
      __init__.py
      apps.py                       ← BibleConfig class
      models.py                     ← Translation, Book, Verse
      views.py                      ← All Bible API views
      serializers.py                ← DRF serializers
      urls.py                       ← /api/bible/* routes ONLY
      admin.py                      ← Register all 3 models
      permissions.py                ← AllowAny for reads, IsAdminUser for writes
      tests.py                      ← Unit tests — REQUIRED, not optional
      management/
        __init__.py
        commands/
          __init__.py
          load_bible.py             ← Import KJV and other translations from JSON
          clear_bible.py            ← Safely remove all Bible data for a translation
```

### 2.2 Frontend (React)

```
frontend/src/
  bible/                            ← NEW React module (completely isolated)
    BibleProvider.jsx               ← Context — wraps entire app, manages all state
    bibleDB.js                      ← All IndexedDB read/write operations
    useBible.js                     ← All public-facing hooks
    BibleReader.jsx                 ← Public chapter reader component
    BibleEditor.jsx                 ← Editor panel: browse + search + insert
    VerseTag.jsx                    ← Inline verse span (replaces hardcoded text)
    VerseBlock.jsx                  ← Block-level verse with formatted reference
    VerseSearch.jsx                 ← Standalone search input + results UI
    BibleDownloadManager.jsx        ← Download progress, retry, status UI
    BibleNavigator.jsx              ← Book/chapter navigator (sidebar/mobile)
    constants.js                    ← Book names, numbers, testament groupings
    index.js                        ← Public exports barrel file
```

---

## 3. BACKEND IMPLEMENTATION

### 3.1 `apps/bible/models.py`

Implement **exactly** these models. No field changes. No index removal.

```python
from django.db import models


class Translation(models.Model):
    """
    Represents a Bible translation/version.
    Examples: KJV (English), NIV (English), YOR (Yoruba), FLS (French Louis Segond)
    """
    code      = models.CharField(max_length=10, unique=True)   # "KJV"
    name      = models.CharField(max_length=100)               # "King James Version"
    language  = models.CharField(max_length=50)                # "English"
    direction = models.CharField(max_length=3, default="ltr")  # "ltr" or "rtl"
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.code

    class Meta:
        ordering = ["code"]


class Book(models.Model):
    TESTAMENT_CHOICES = [("OT", "Old Testament"), ("NT", "New Testament")]

    translation   = models.ForeignKey(Translation, on_delete=models.CASCADE, related_name="books")
    number        = models.PositiveSmallIntegerField()   # 1 = Genesis, 66 = Revelation
    name          = models.CharField(max_length=100)     # "Genesis"
    abbreviation  = models.CharField(max_length=10)      # "Gen"
    testament     = models.CharField(max_length=2, choices=TESTAMENT_CHOICES)
    chapter_count = models.PositiveSmallIntegerField()   # How many chapters in this book

    class Meta:
        unique_together = ["translation", "number"]
        ordering = ["number"]

    def __str__(self):
        return f"{self.translation.code} — {self.name}"


class Verse(models.Model):
    """
    Flat verse table. book_number is denormalized from Book.number intentionally
    for query speed. DO NOT remove it.
    """
    translation = models.ForeignKey(Translation, on_delete=models.CASCADE, related_name="verses")
    book        = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="verses")
    book_number = models.PositiveSmallIntegerField()   # 1–66 (denormalized for speed)
    chapter     = models.PositiveSmallIntegerField()   # 1–150
    verse       = models.PositiveSmallIntegerField()   # 1–176
    text        = models.TextField()

    class Meta:
        unique_together = ["translation", "book_number", "chapter", "verse"]
        indexes = [
            # Primary lookup: all verses in a chapter
            models.Index(fields=["translation", "book_number", "chapter"]),
            # Exact verse lookup
            models.Index(fields=["translation", "book_number", "chapter", "verse"]),
        ]

    def __str__(self):
        return f"{self.book.name} {self.chapter}:{self.verse} ({self.translation.code})"
```

### 3.2 `apps/bible/views.py`

```python
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from .models import Translation, Book, Verse


CACHE_YEAR = 60 * 60 * 24 * 365  # 365 days — Bible never changes


class TranslationsListView(APIView):
    """
    Returns list of all available translations.
    Cached for 1 year.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        cache_key = "bible_translations_list"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        data = list(
            Translation.objects.filter(is_active=True)
            .values("code", "name", "language", "direction")
        )
        cache.set(cache_key, data, CACHE_YEAR)
        return Response(data)


class BibleMetaView(APIView):
    """
    Returns ALL books + chapter counts for ALL translations.
    Downloaded once by the frontend and stored in IndexedDB.
    Cached for 1 year in Redis.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        cache_key = "bible_meta_all"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        data = {}
        for translation in Translation.objects.filter(is_active=True):
            books = []
            for book in translation.books.order_by("number"):
                books.append({
                    "number":        book.number,
                    "name":          book.name,
                    "abbreviation":  book.abbreviation,
                    "testament":     book.testament,
                    "chapters":      book.chapter_count,
                })
            data[translation.code] = {
                "name":      translation.name,
                "language":  translation.language,
                "direction": translation.direction,
                "books":     books,
            }

        cache.set(cache_key, data, CACHE_YEAR)
        return Response(data)


class FullTranslationView(APIView):
    """
    ⚡ THE CRITICAL ENDPOINT.

    Returns the ENTIRE Bible for one translation as a single JSON blob.
    The frontend calls this ONCE, saves to IndexedDB, never calls again.

    Response structure (MUST NOT change — frontend depends on this exact shape):
    {
        "translation": "KJV",
        "books": {
            "1": "Genesis",
            "2": "Exodus",
            ...
            "66": "Revelation"
        },
        "verses": {
            "1": {                          // book_number
                "1": {                      // chapter
                    "1": "In the beginning God created...",  // verse: text
                    "2": "And the earth was without form..."
                }
            }
        }
    }
    """
    permission_classes = [AllowAny]

    def get(self, request, translation_code):
        cache_key = f"full_bible_{translation_code}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        try:
            translation = Translation.objects.get(code=translation_code, is_active=True)
        except Translation.DoesNotExist:
            return Response({"error": f"Translation '{translation_code}' not found."}, status=404)

        # Build books lookup
        books_map = {}
        for book in translation.books.order_by("number"):
            books_map[str(book.number)] = book.name

        # Build nested verses structure: { book: { chapter: { verse: text } } }
        verses_map = {}
        qs = Verse.objects.filter(translation=translation).order_by(
            "book_number", "chapter", "verse"
        ).values("book_number", "chapter", "verse", "text")

        for v in qs:
            b = str(v["book_number"])
            c = str(v["chapter"])
            vn = str(v["verse"])
            if b not in verses_map:
                verses_map[b] = {}
            if c not in verses_map[b]:
                verses_map[b][c] = {}
            verses_map[b][c][vn] = v["text"]

        data = {
            "translation": translation_code,
            "books":       books_map,
            "verses":      verses_map,
        }

        cache.set(cache_key, data, CACHE_YEAR)
        return Response(data)


class ChapterView(APIView):
    """
    Returns all verses in one chapter.
    Used for lazy loading individual chapters (optional, but keep for flexibility).
    Cached for 1 year.
    """
    permission_classes = [AllowAny]

    def get(self, request, translation_code, book_number, chapter_number):
        cache_key = f"chapter_{translation_code}_{book_number}_{chapter_number}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        try:
            book = Book.objects.select_related("translation").get(
                translation__code=translation_code,
                number=book_number
            )
        except Book.DoesNotExist:
            return Response({"error": "Book not found."}, status=404)

        verses = list(
            Verse.objects.filter(
                translation__code=translation_code,
                book_number=book_number,
                chapter=chapter_number,
            ).order_by("verse").values("verse", "text")
        )

        if not verses:
            return Response({"error": "Chapter not found."}, status=404)

        data = {
            "translation": translation_code,
            "book_number": book_number,
            "book_name":   book.name,
            "chapter":     chapter_number,
            "verses":      verses,
            "total":       len(verses),
        }

        cache.set(cache_key, data, CACHE_YEAR)
        return Response(data)


@api_view(["GET"])
@permission_classes([AllowAny])
def search_verses(request):
    """
    Server-side search. Used as fallback only — primary search is local.
    Query params: q (search string), translation (code, default KJV), limit (default 50)
    """
    q           = request.GET.get("q", "").strip()
    translation = request.GET.get("translation", "KJV")
    limit       = min(int(request.GET.get("limit", 50)), 200)

    if len(q) < 2:
        return Response({"results": [], "error": "Query must be at least 2 characters."})

    verses = Verse.objects.filter(
        translation__code=translation,
        text__icontains=q,
    ).select_related("book").values(
        "book__name", "book_number", "chapter", "verse", "text"
    )[:limit]

    results = [
        {
            "book_name":   v["book__name"],
            "book_number": v["book_number"],
            "chapter":     v["chapter"],
            "verse":       v["verse"],
            "text":        v["text"],
        }
        for v in verses
    ]

    return Response({"results": results, "count": len(results)})
```

### 3.3 `apps/bible/urls.py`

```python
from django.urls import path
from . import views

urlpatterns = [
    # List all translations
    path("translations/",
         views.TranslationsListView.as_view(),
         name="bible-translations"),

    # All books + chapter counts for all translations (downloaded once)
    path("meta/",
         views.BibleMetaView.as_view(),
         name="bible-meta"),

    # ⚡ Download entire translation (called once per translation, ever)
    path("download/<str:translation_code>/",
         views.FullTranslationView.as_view(),
         name="bible-full-translation"),

    # Single chapter (flexible, for lazy loading)
    path("<str:translation_code>/<int:book_number>/<int:chapter_number>/",
         views.ChapterView.as_view(),
         name="bible-chapter"),

    # Server-side search (fallback only)
    path("search/",
         views.search_verses,
         name="bible-search"),
]
```

**Add to your main `backend/urls.py` (this is one of only 4 allowed changes to existing files):**

```python
path("api/bible/", include("apps.bible.urls")),
```

### 3.4 `apps/bible/admin.py`

```python
from django.contrib import admin
from .models import Translation, Book, Verse


@admin.register(Translation)
class TranslationAdmin(admin.ModelAdmin):
    list_display  = ["code", "name", "language", "direction", "is_active"]
    list_filter   = ["is_active", "language"]
    search_fields = ["code", "name"]


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display  = ["number", "name", "abbreviation", "testament", "chapter_count", "translation"]
    list_filter   = ["testament", "translation"]
    search_fields = ["name", "abbreviation"]
    ordering      = ["translation", "number"]


@admin.register(Verse)
class VerseAdmin(admin.ModelAdmin):
    list_display  = ["translation", "book_number", "chapter", "verse", "text_preview"]
    list_filter   = ["translation"]
    search_fields = ["text"]
    ordering      = ["translation", "book_number", "chapter", "verse"]

    def text_preview(self, obj):
        return obj.text[:80] + "..." if len(obj.text) > 80 else obj.text
    text_preview.short_description = "Text Preview"
```

### 3.5 `apps.py`

```python
from django.apps import AppConfig


class BibleConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name               = "apps.bible"
    verbose_name       = "Bible Module"
```

### 3.6 `settings.py` Changes

Add to `INSTALLED_APPS` (only addition, nothing else changed):

```python
INSTALLED_APPS = [
    # ... existing apps unchanged ...
    "apps.bible",
]
```

Add Redis cache config:

```python
CACHES = {
    "default": {
        "BACKEND":  "django_redis.cache.RedisCache",
        "LOCATION": env("REDIS_URL", default="redis://127.0.0.1:6379/1"),
        "OPTIONS":  {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
        "TIMEOUT":  60 * 60 * 24 * 365,
    }
}
```

Install packages:

```bash
pip install django-redis
```

### 3.7 `management/commands/load_bible.py`

```python
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
```

### 3.8 `tests.py`

```python
from django.test import TestCase
from django.urls import reverse
from django.core.cache import cache
from rest_framework.test import APITestCase
from rest_framework import status
from .models import Translation, Book, Verse


def create_test_data():
    """Creates minimal test data: KJV, Genesis, 3 verses."""
    t = Translation.objects.create(code="KJV", name="King James Version", language="English")
    b = Book.objects.create(
        translation=t, number=1, name="Genesis",
        abbreviation="Gen", testament="OT", chapter_count=50
    )
    Verse.objects.create(translation=t, book=b, book_number=1, chapter=1, verse=1,
                         text="In the beginning God created the heaven and the earth.")
    Verse.objects.create(translation=t, book=b, book_number=1, chapter=1, verse=2,
                         text="And the earth was without form, and void.")
    Verse.objects.create(translation=t, book=b, book_number=1, chapter=1, verse=3,
                         text="And God said, Let there be light: and there was light.")
    return t, b


class TranslationModelTest(TestCase):
    def test_str_returns_code(self):
        t = Translation(code="KJV", name="King James Version", language="English")
        self.assertEqual(str(t), "KJV")


class FullTranslationViewTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.translation, _ = create_test_data()

    def test_returns_200(self):
        res = self.client.get("/api/bible/download/KJV/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_response_structure(self):
        res = self.client.get("/api/bible/download/KJV/")
        data = res.json()
        self.assertIn("translation", data)
        self.assertIn("books", data)
        self.assertIn("verses", data)
        self.assertEqual(data["translation"], "KJV")

    def test_verse_accessible_by_nested_key(self):
        res = self.client.get("/api/bible/download/KJV/")
        verse_text = res.json()["verses"]["1"]["1"]["1"]
        self.assertIn("beginning", verse_text)

    def test_unknown_translation_returns_404(self):
        res = self.client.get("/api/bible/download/XYZ/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


class ChapterViewTest(APITestCase):
    def setUp(self):
        cache.clear()
        create_test_data()

    def test_chapter_returns_correct_verse_count(self):
        res = self.client.get("/api/bible/KJV/1/1/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.json()["verses"]), 3)


class MetaViewTest(APITestCase):
    def setUp(self):
        cache.clear()
        create_test_data()

    def test_meta_contains_translation(self):
        res = self.client.get("/api/bible/meta/")
        self.assertIn("KJV", res.json())


class SearchTest(APITestCase):
    def setUp(self):
        create_test_data()

    def test_search_returns_results(self):
        res = self.client.get("/api/bible/search/?q=beginning&translation=KJV")
        results = res.json()["results"]
        self.assertGreaterEqual(len(results), 1)
        self.assertIn("beginning", results[0]["text"])

    def test_short_query_returns_empty(self):
        res = self.client.get("/api/bible/search/?q=a&translation=KJV")
        self.assertEqual(res.json()["results"], [])
```

---

## 4. FRONTEND IMPLEMENTATION

### 4.1 Install Required Packages

```bash
cd frontend
npm install idb @tanstack/react-query
```

> ⚠️ Do NOT use any other IndexedDB library. Do NOT implement raw IndexedDB without the `idb` wrapper.

### 4.2 `bible/constants.js`

```js
export const BOOKS = [
  { number: 1,  name: "Genesis",        abbreviation: "Gen",   testament: "OT", chapters: 50  },
  { number: 2,  name: "Exodus",         abbreviation: "Exod",  testament: "OT", chapters: 40  },
  { number: 3,  name: "Leviticus",      abbreviation: "Lev",   testament: "OT", chapters: 27  },
  { number: 4,  name: "Numbers",        abbreviation: "Num",   testament: "OT", chapters: 36  },
  { number: 5,  name: "Deuteronomy",    abbreviation: "Deut",  testament: "OT", chapters: 34  },
  { number: 6,  name: "Joshua",         abbreviation: "Josh",  testament: "OT", chapters: 24  },
  { number: 7,  name: "Judges",         abbreviation: "Judg",  testament: "OT", chapters: 21  },
  { number: 8,  name: "Ruth",           abbreviation: "Ruth",  testament: "OT", chapters: 4   },
  { number: 9,  name: "1 Samuel",       abbreviation: "1Sam",  testament: "OT", chapters: 31  },
  { number: 10, name: "2 Samuel",       abbreviation: "2Sam",  testament: "OT", chapters: 24  },
  { number: 11, name: "1 Kings",        abbreviation: "1Kgs",  testament: "OT", chapters: 22  },
  { number: 12, name: "2 Kings",        abbreviation: "2Kgs",  testament: "OT", chapters: 25  },
  { number: 13, name: "1 Chronicles",   abbreviation: "1Chr",  testament: "OT", chapters: 29  },
  { number: 14, name: "2 Chronicles",   abbreviation: "2Chr",  testament: "OT", chapters: 36  },
  { number: 15, name: "Ezra",           abbreviation: "Ezra",  testament: "OT", chapters: 10  },
  { number: 16, name: "Nehemiah",       abbreviation: "Neh",   testament: "OT", chapters: 13  },
  { number: 17, name: "Esther",         abbreviation: "Esth",  testament: "OT", chapters: 10  },
  { number: 18, name: "Job",            abbreviation: "Job",   testament: "OT", chapters: 42  },
  { number: 19, name: "Psalms",         abbreviation: "Ps",    testament: "OT", chapters: 150 },
  { number: 20, name: "Proverbs",       abbreviation: "Prov",  testament: "OT", chapters: 31  },
  { number: 21, name: "Ecclesiastes",   abbreviation: "Eccl",  testament: "OT", chapters: 12  },
  { number: 22, name: "Song of Solomon",abbreviation: "Song",  testament: "OT", chapters: 8   },
  { number: 23, name: "Isaiah",         abbreviation: "Isa",   testament: "OT", chapters: 66  },
  { number: 24, name: "Jeremiah",       abbreviation: "Jer",   testament: "OT", chapters: 52  },
  { number: 25, name: "Lamentations",   abbreviation: "Lam",   testament: "OT", chapters: 5   },
  { number: 26, name: "Ezekiel",        abbreviation: "Ezek",  testament: "OT", chapters: 48  },
  { number: 27, name: "Daniel",         abbreviation: "Dan",   testament: "OT", chapters: 12  },
  { number: 28, name: "Hosea",          abbreviation: "Hos",   testament: "OT", chapters: 14  },
  { number: 29, name: "Joel",           abbreviation: "Joel",  testament: "OT", chapters: 3   },
  { number: 30, name: "Amos",           abbreviation: "Amos",  testament: "OT", chapters: 9   },
  { number: 31, name: "Obadiah",        abbreviation: "Obad",  testament: "OT", chapters: 1   },
  { number: 32, name: "Jonah",          abbreviation: "Jonah", testament: "OT", chapters: 4   },
  { number: 33, name: "Micah",          abbreviation: "Mic",   testament: "OT", chapters: 7   },
  { number: 34, name: "Nahum",          abbreviation: "Nah",   testament: "OT", chapters: 3   },
  { number: 35, name: "Habakkuk",       abbreviation: "Hab",   testament: "OT", chapters: 3   },
  { number: 36, name: "Zephaniah",      abbreviation: "Zeph",  testament: "OT", chapters: 3   },
  { number: 37, name: "Haggai",         abbreviation: "Hag",   testament: "OT", chapters: 2   },
  { number: 38, name: "Zechariah",      abbreviation: "Zech",  testament: "OT", chapters: 14  },
  { number: 39, name: "Malachi",        abbreviation: "Mal",   testament: "OT", chapters: 4   },
  { number: 40, name: "Matthew",        abbreviation: "Matt",  testament: "NT", chapters: 28  },
  { number: 41, name: "Mark",           abbreviation: "Mark",  testament: "NT", chapters: 16  },
  { number: 42, name: "Luke",           abbreviation: "Luke",  testament: "NT", chapters: 24  },
  { number: 43, name: "John",           abbreviation: "John",  testament: "NT", chapters: 21  },
  { number: 44, name: "Acts",           abbreviation: "Acts",  testament: "NT", chapters: 28  },
  { number: 45, name: "Romans",         abbreviation: "Rom",   testament: "NT", chapters: 16  },
  { number: 46, name: "1 Corinthians",  abbreviation: "1Cor",  testament: "NT", chapters: 16  },
  { number: 47, name: "2 Corinthians",  abbreviation: "2Cor",  testament: "NT", chapters: 13  },
  { number: 48, name: "Galatians",      abbreviation: "Gal",   testament: "NT", chapters: 6   },
  { number: 49, name: "Ephesians",      abbreviation: "Eph",   testament: "NT", chapters: 6   },
  { number: 50, name: "Philippians",    abbreviation: "Phil",  testament: "NT", chapters: 4   },
  { number: 51, name: "Colossians",     abbreviation: "Col",   testament: "NT", chapters: 4   },
  { number: 52, name: "1 Thessalonians",abbreviation: "1Thess",testament: "NT", chapters: 5   },
  { number: 53, name: "2 Thessalonians",abbreviation: "2Thess",testament: "NT", chapters: 3   },
  { number: 54, name: "1 Timothy",      abbreviation: "1Tim",  testament: "NT", chapters: 6   },
  { number: 55, name: "2 Timothy",      abbreviation: "2Tim",  testament: "NT", chapters: 4   },
  { number: 56, name: "Titus",          abbreviation: "Titus", testament: "NT", chapters: 3   },
  { number: 57, name: "Philemon",       abbreviation: "Phlm",  testament: "NT", chapters: 1   },
  { number: 58, name: "Hebrews",        abbreviation: "Heb",   testament: "NT", chapters: 13  },
  { number: 59, name: "James",          abbreviation: "Jas",   testament: "NT", chapters: 5   },
  { number: 60, name: "1 Peter",        abbreviation: "1Pet",  testament: "NT", chapters: 5   },
  { number: 61, name: "2 Peter",        abbreviation: "2Pet",  testament: "NT", chapters: 3   },
  { number: 62, name: "1 John",         abbreviation: "1John", testament: "NT", chapters: 5   },
  { number: 63, name: "2 John",         abbreviation: "2John", testament: "NT", chapters: 1   },
  { number: 64, name: "3 John",         abbreviation: "3John", testament: "NT", chapters: 1   },
  { number: 65, name: "Jude",           abbreviation: "Jude",  testament: "NT", chapters: 1   },
  { number: 66, name: "Revelation",     abbreviation: "Rev",   testament: "NT", chapters: 22  },
];

// Lookup: BOOK_BY_NUMBER[1] => { number: 1, name: "Genesis", ... }
export const BOOK_BY_NUMBER = Object.fromEntries(BOOKS.map(b => [b.number, b]));

// Lookup: BOOK_BY_NAME["Genesis"] => 1
export const BOOK_NUMBER_BY_NAME = Object.fromEntries(BOOKS.map(b => [b.name, b.number]));

export const OLD_TESTAMENT = BOOKS.filter(b => b.testament === "OT");
export const NEW_TESTAMENT = BOOKS.filter(b => b.testament === "NT");

export const DEFAULT_TRANSLATION = "KJV";
```

### 4.3 `bible/bibleDB.js`

```js
import { openDB } from 'idb';

const DB_NAME    = 'AppBibleDB';
const DB_VERSION = 1;

let _db = null;

async function getDB() {
  if (_db) return _db;

  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('translations')) {
        db.createObjectStore('translations', { keyPath: 'code' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('bookmarks')) {
        db.createObjectStore('bookmarks', { keyPath: 'id', autoIncrement: true });
      }
    },
  });

  return _db;
}

export const bibleDB = {

  async saveTranslation(code, verses) {
    const db = await getDB();
    await db.put('translations', { code, verses, savedAt: Date.now() });
  },

  async getTranslation(code) {
    const db = await getDB();
    const record = await db.get('translations', code);
    return record ? record.verses : null;
  },

  async hasTranslation(code) {
    const db = await getDB();
    const record = await db.get('translations', code);
    return !!record;
  },

  async deleteTranslation(code) {
    const db = await getDB();
    await db.delete('translations', code);
  },

  async listDownloaded() {
    const db = await getDB();
    const all = await db.getAll('translations');
    return all.map(r => r.code);
  },

  async saveMeta(data) {
    const db = await getDB();
    await db.put('meta', { key: 'bible_meta', data, savedAt: Date.now() });
  },

  async getMeta() {
    const db = await getDB();
    const record = await db.get('meta', 'bible_meta');
    return record ? record.data : null;
  },

  async saveBookmarks(bookmarks) {
    const db = await getDB();
    const tx = db.transaction('bookmarks', 'readwrite');
    await tx.store.clear();
    for (const bm of bookmarks) {
      await tx.store.add(bm);
    }
    await tx.done;
  },

  async getBookmarks() {
    const db = await getDB();
    return db.getAll('bookmarks');
  },

  async clearAll() {
    const db = await getDB();
    await db.clear('translations');
    await db.clear('meta');
    await db.clear('bookmarks');
  },
};
```

### 4.4 `bible/BibleProvider.jsx`

```jsx
import React, {
  createContext, useContext, useEffect, useState,
  useCallback, useRef,
} from 'react';
import { bibleDB } from './bibleDB';
import { DEFAULT_TRANSLATION } from './constants';

const BibleContext = createContext(null);

export function BibleProvider({ children, defaultTranslation = DEFAULT_TRANSLATION }) {
  const [meta, setMeta]                         = useState(null);
  const [translation, setTranslationState]      = useState(defaultTranslation);
  const [isReady, setIsReady]                   = useState(false);
  const [isOnline, setIsOnline]                 = useState(navigator.onLine);
  const [isDownloading, setIsDownloading]       = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadError, setDownloadError]       = useState(null);
  const [downloadedTranslations, setDownloaded] = useState([]);
  const [availableTranslations, setAvailable]   = useState([]);

  // In-memory cache — synchronous reads, instant
  // Structure: { "KJV": { "1": { "1": { "1": "In the beginning..." } } } }
  const memCache = useRef({});

  // ── Online/Offline tracking ────────────────────────────────────────────────
  useEffect(() => {
    const goOnline  = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // ── Load metadata ──────────────────────────────────────────────────────────
  const loadMeta = useCallback(async () => {
    const local = await bibleDB.getMeta();
    if (local) {
      setMeta(local);
      return local;
    }
    if (!navigator.onLine) return null;

    try {
      const res  = await fetch('/api/bible/meta/');
      const data = await res.json();
      await bibleDB.saveMeta(data);
      setMeta(data);
      return data;
    } catch (err) {
      console.error('[Bible] Failed to load meta:', err);
      return null;
    }
  }, []);

  // ── Load available translations from server ────────────────────────────────
  const loadAvailable = useCallback(async () => {
    if (!navigator.onLine) return;
    try {
      const res  = await fetch('/api/bible/translations/');
      const data = await res.json();
      setAvailable(data);
    } catch (_) {}
  }, []);

  // ── Download and store a full translation ─────────────────────────────────
  const downloadTranslation = useCallback(async (code) => {
    setDownloadError(null);

    // Already in memory — nothing to do
    if (memCache.current[code]) return true;

    // Already in IndexedDB — load into memory
    const existing = await bibleDB.getTranslation(code);
    if (existing) {
      memCache.current[code] = existing;
      setDownloaded(prev => [...new Set([...prev, code])]);
      return true;
    }

    // Need to download
    if (!navigator.onLine) {
      setDownloadError('You are offline. Connect to the internet to download the Bible.');
      return false;
    }

    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const res = await fetch(`/api/bible/download/${code}/`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      // Simulate progress (fetch doesn't give progress natively without streaming)
      setDownloadProgress(30);
      const data = await res.json();
      setDownloadProgress(70);

      await bibleDB.saveTranslation(code, data.verses);
      setDownloadProgress(95);

      memCache.current[code] = data.verses;
      setDownloaded(prev => [...new Set([...prev, code])]);
      setDownloadProgress(100);
      return true;
    } catch (err) {
      console.error(`[Bible] Download failed for ${code}:`, err);
      setDownloadError(`Download failed: ${err.message}. Please try again.`);
      return false;
    } finally {
      setIsDownloading(false);
    }
  }, []);

  // ── Switch active translation ──────────────────────────────────────────────
  const setTranslation = useCallback(async (code) => {
    if (memCache.current[code]) {
      setTranslationState(code);
      return;
    }
    const success = await downloadTranslation(code);
    if (success) setTranslationState(code);
  }, [downloadTranslation]);

  // ── Initialization ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const [downloaded] = await Promise.all([
        bibleDB.listDownloaded(),
        loadMeta(),
        loadAvailable(),
      ]);
      setDownloaded(downloaded);

      const success = await downloadTranslation(defaultTranslation);
      setIsReady(success);
    }
    init();
  }, []); // eslint-disable-line

  // ── Data access (ALL synchronous reads from memCache) ─────────────────────

  const getVerse = useCallback((book, chapter, verse, tr = translation) => {
    return memCache.current[tr]?.[String(book)]?.[String(chapter)]?.[String(verse)] ?? null;
  }, [translation]);

  const getChapter = useCallback((book, chapter, tr = translation) => {
    const chData = memCache.current[tr]?.[String(book)]?.[String(chapter)];
    if (!chData) return [];
    return Object.entries(chData)
      .map(([v, text]) => ({ verse: Number(v), text }))
      .sort((a, b) => a.verse - b.verse);
  }, [translation]);

  const getBook = useCallback((bookNumber, tr = translation) => {
    return memCache.current[tr]?.[String(bookNumber)] ?? {};
  }, [translation]);

  const getBookInfo = useCallback((bookNumber, tr = translation) => {
    return meta?.[tr]?.books?.find(b => b.number === bookNumber) ?? null;
  }, [meta, translation]);

  const getBooks = useCallback((tr = translation) => {
    return meta?.[tr]?.books ?? [];
  }, [meta, translation]);

  const getChapterCount = useCallback((bookNumber, tr = translation) => {
    return getBookInfo(bookNumber, tr)?.chapters ?? 0;
  }, [getBookInfo]);

  const isDownloaded = useCallback((code) => {
    return downloadedTranslations.includes(code);
  }, [downloadedTranslations]);

  const searchVerses = useCallback((query, tr = translation, limit = 50) => {
    const cache = memCache.current[tr];
    if (!cache || !query || query.length < 2) return [];

    const results = [];
    const q = query.toLowerCase();
    const books = meta?.[tr]?.books ?? [];

    outer:
    for (const [bookNum, chapters] of Object.entries(cache)) {
      const bookInfo = books.find(b => b.number === Number(bookNum));
      for (const [chNum, verses] of Object.entries(chapters)) {
        for (const [vNum, text] of Object.entries(verses)) {
          if (text.toLowerCase().includes(q)) {
            results.push({
              book:      Number(bookNum),
              book_name: bookInfo?.name ?? `Book ${bookNum}`,
              chapter:   Number(chNum),
              verse:     Number(vNum),
              text,
            });
            if (results.length >= limit) break outer;
          }
        }
      }
    }

    return results;
  }, [translation, meta]);

  const value = {
    // State
    meta, isReady, isOnline, isDownloading, downloadProgress, downloadError,
    translation, availableTranslations, downloadedTranslations,
    // Actions
    setTranslation, downloadTranslation,
    // Data access — all synchronous, all instant
    getVerse, getChapter, getBook, getBookInfo, getBooks,
    getChapterCount, isDownloaded, searchVerses,
  };

  return (
    <BibleContext.Provider value={value}>
      {children}
    </BibleContext.Provider>
  );
}

export function useBible() {
  const ctx = useContext(BibleContext);
  if (!ctx) throw new Error('useBible() must be used inside <BibleProvider>');
  return ctx;
}
```

### 4.5 `bible/useBible.js`

```js
import { useMemo } from 'react';
import { useBible } from './BibleProvider';

export { useBible };

export function useVerse(book, chapter, verse, translation) {
  const { getVerse, isReady } = useBible();
  return useMemo(() => {
    if (!isReady) return null;
    return getVerse(book, chapter, verse, translation);
  }, [book, chapter, verse, translation, isReady, getVerse]);
}

export function useChapter(book, chapter, translation) {
  const { getChapter, isReady } = useBible();
  return useMemo(() => {
    if (!isReady) return [];
    return getChapter(book, chapter, translation);
  }, [book, chapter, translation, isReady, getChapter]);
}

export function useBooks(translation) {
  const { getBooks, isReady } = useBible();
  return useMemo(() => {
    if (!isReady) return [];
    return getBooks(translation);
  }, [translation, isReady, getBooks]);
}

export function useBookInfo(bookNumber, translation) {
  const { getBookInfo, isReady } = useBible();
  return useMemo(() => {
    if (!isReady) return null;
    return getBookInfo(bookNumber, translation);
  }, [bookNumber, translation, isReady, getBookInfo]);
}

export function useVerseSearch(query, translation) {
  const { searchVerses, isReady } = useBible();
  return useMemo(() => {
    if (!isReady || !query) return [];
    return searchVerses(query, translation);
  }, [query, translation, isReady, searchVerses]);
}

export function useBibleReady() {
  return useBible().isReady;
}

export function useTranslation() {
  const { translation, setTranslation } = useBible();
  return [translation, setTranslation];
}
```

### 4.6 `bible/VerseTag.jsx`

```jsx
import { useVerse, useBookInfo } from './useBible';

/**
 * Drop-in replacement for every hardcoded verse in the app.
 *
 * Usage:
 *   <VerseTag book={1} chapter={1} verse={1} />
 *   <VerseTag book={43} chapter={3} verse={16} showRef={false} />
 */
export function VerseTag({ book, chapter, verse, translation, showRef = true, className = '' }) {
  const text     = useVerse(book, chapter, verse, translation);
  const bookInfo = useBookInfo(book, translation);

  if (text === null) {
    return (
      <span className={`bible-verse-loading ${className}`} aria-busy="true">
        Loading...
      </span>
    );
  }

  return (
    <span className={`bible-verse-tag ${className}`}>
      &ldquo;{text}&rdquo;
      {showRef && (
        <cite className="bible-verse-ref">
          {' '}&mdash; {bookInfo?.name ?? `Book ${book}`} {chapter}:{verse}
        </cite>
      )}
    </span>
  );
}
```

### 4.7 `bible/VerseBlock.jsx`

```jsx
import { useBible } from './BibleProvider';

/**
 * Full-width verse display with formatted blockquote styling.
 *
 * Usage:
 *   <VerseBlock book={19} chapter={23} verse={1} />
 */
export function VerseBlock({ book, chapter, verse, translation, className = '' }) {
  const { getVerse, getBookInfo, isReady } = useBible();

  if (!isReady) {
    return (
      <blockquote className={`bible-verse-block bible-verse-skeleton ${className}`}>
        <p>Loading verse...</p>
      </blockquote>
    );
  }

  const text     = getVerse(book, chapter, verse, translation);
  const bookInfo = getBookInfo(book, translation);

  if (!text) return null;

  return (
    <blockquote className={`bible-verse-block ${className}`}>
      <p>&ldquo;{text}&rdquo;</p>
      <footer>
        &mdash; {bookInfo?.name ?? `Book ${book}`} {chapter}:{verse}
        {translation && <span className="bible-translation-badge"> ({translation})</span>}
      </footer>
    </blockquote>
  );
}
```

### 4.8 `bible/BibleDownloadManager.jsx`

```jsx
import { useBible } from './BibleProvider';

export function BibleDownloadManager({ translationCode = 'KJV', autoDownload = false }) {
  const {
    isReady, isOnline, isDownloading,
    downloadProgress, downloadError,
    downloadTranslation, isDownloaded,
  } = useBible();

  const downloaded = isDownloaded(translationCode);

  if (isReady && downloaded) return null;

  if (!isOnline && !downloaded) {
    return (
      <div className="bible-banner bible-banner--offline" role="alert">
        📵 You are offline. Connect to the internet once to download the Bible for permanent offline use.
      </div>
    );
  }

  if (isDownloading) {
    return (
      <div className="bible-banner bible-banner--downloading" role="status">
        <span>📖 Downloading Bible ({translationCode})...</span>
        <div className="bible-progress-bar">
          <div
            className="bible-progress-fill"
            style={{ width: `${downloadProgress}%` }}
            aria-valuenow={downloadProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <span>{downloadProgress}% — This only happens once.</span>
      </div>
    );
  }

  if (downloadError) {
    return (
      <div className="bible-banner bible-banner--error" role="alert">
        ❌ {downloadError}
        <button
          onClick={() => downloadTranslation(translationCode)}
          className="bible-retry-btn"
        >
          Retry Download
        </button>
      </div>
    );
  }

  if (!downloaded && isOnline) {
    if (autoDownload) {
      downloadTranslation(translationCode);
      return (
        <div className="bible-banner bible-banner--downloading" role="status">
          📖 Preparing Bible data for offline use...
        </div>
      );
    }

    return (
      <div className="bible-banner bible-banner--prompt">
        <p>📖 Download the complete Bible once for permanent offline access (~1.5MB).</p>
        <button
          onClick={() => downloadTranslation(translationCode)}
          className="bible-download-btn"
        >
          Download Now
        </button>
      </div>
    );
  }

  return null;
}
```

### 4.9 `bible/BibleReader.jsx`

```jsx
import { useState } from 'react';
import { useBible } from './BibleProvider';
import { useChapter, useBooks } from './useBible';

export function BibleReader({ defaultBook = 1, defaultChapter = 1 }) {
  const { isReady, isOnline, getChapterCount } = useBible();
  const [bookNum, setBookNum]     = useState(defaultBook);
  const [chapterNum, setChapter]  = useState(defaultChapter);

  const books   = useBooks();
  const verses  = useChapter(bookNum, chapterNum);
  const maxCh   = getChapterCount(bookNum);
  const bookInfo = books.find(b => b.number === bookNum);

  function goToPrev() {
    if (chapterNum > 1) {
      setChapter(ch => ch - 1);
    } else if (bookNum > 1) {
      const prevBook = bookNum - 1;
      const prevCount = getChapterCount(prevBook);
      setBookNum(prevBook);
      setChapter(prevCount);
    }
  }

  function goToNext() {
    if (chapterNum < maxCh) {
      setChapter(ch => ch + 1);
    } else if (bookNum < 66) {
      setBookNum(b => b + 1);
      setChapter(1);
    }
  }

  if (!isReady) {
    return (
      <div className="bible-reader bible-reader--loading">
        <p>Loading Bible data...</p>
      </div>
    );
  }

  return (
    <div className="bible-reader">

      {/* Offline badge */}
      {!isOnline && (
        <span className="bible-offline-badge" title="Reading offline">📵 Offline</span>
      )}

      {/* Controls */}
      <div className="bible-reader-controls">
        <select
          value={bookNum}
          onChange={e => { setBookNum(Number(e.target.value)); setChapter(1); }}
          aria-label="Select book"
        >
          {books.map(b => (
            <option key={b.number} value={b.number}>{b.name}</option>
          ))}
        </select>

        <select
          value={chapterNum}
          onChange={e => setChapter(Number(e.target.value))}
          aria-label="Select chapter"
        >
          {Array.from({ length: maxCh }, (_, i) => i + 1).map(n => (
            <option key={n} value={n}>Chapter {n}</option>
          ))}
        </select>
      </div>

      {/* Reference heading */}
      <h2 className="bible-reader-heading">
        {bookInfo?.name} {chapterNum}
      </h2>

      {/* Verses */}
      <div className="bible-reader-verses">
        {verses.map(({ verse, text }) => (
          <p key={verse} className="bible-verse-line">
            <sup className="bible-verse-num">{verse}</sup>
            {text}
          </p>
        ))}
      </div>

      {/* Navigation */}
      <div className="bible-reader-nav">
        <button onClick={goToPrev} disabled={bookNum === 1 && chapterNum === 1}>
          ← Previous Chapter
        </button>
        <button onClick={goToNext} disabled={bookNum === 66 && chapterNum === maxCh}>
          Next Chapter →
        </button>
      </div>

    </div>
  );
}
```

### 4.10 `bible/BibleEditor.jsx`

```jsx
import { useState, useCallback } from 'react';
import { useBible } from './BibleProvider';
import { useVerseSearch, useBooks } from './useBible';

/**
 * Editor panel for inserting Bible verses into content.
 *
 * Props:
 *   onInsert(verseObj) — called when editor clicks Insert
 *     verseObj = { book, chapter, verse, text, book_name, reference }
 */
export function BibleEditor({ onInsert }) {
  const { isReady, getChapter, getChapterCount, getBookInfo } = useBible();

  const [panel, setPanel]       = useState('browse');  // 'browse' | 'search'
  const [bookNum, setBookNum]    = useState(1);
  const [chapterNum, setChapter] = useState(1);
  const [query, setQuery]        = useState('');

  const books         = useBooks();
  const searchResults = useVerseSearch(query);
  const verses        = getChapter(bookNum, chapterNum);
  const bookInfo      = getBookInfo(bookNum);
  const maxChapters   = getChapterCount(bookNum);

  const handleInsert = useCallback((book, chapter, verse, text, bookName) => {
    if (typeof onInsert === 'function') {
      onInsert({
        book, chapter, verse, text, book_name: bookName,
        reference: `${bookName} ${chapter}:${verse}`,
      });
    }
  }, [onInsert]);

  if (!isReady) {
    return <div className="bible-editor">Loading Bible data...</div>;
  }

  return (
    <div className="bible-editor">

      {/* Tab toggle */}
      <div className="bible-editor-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={panel === 'browse'}
          onClick={() => setPanel('browse')}
          className={panel === 'browse' ? 'active' : ''}
        >
          Browse
        </button>
        <button
          role="tab"
          aria-selected={panel === 'search'}
          onClick={() => setPanel('search')}
          className={panel === 'search' ? 'active' : ''}
        >
          Search
        </button>
      </div>

      {/* Search panel */}
      {panel === 'search' && (
        <div className="bible-editor-search" role="tabpanel">
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search all verses... (offline, instant)"
            autoFocus
          />
          <div className="bible-editor-results">
            {query.length > 1 && searchResults.length === 0 && (
              <p className="bible-no-results">No results for &ldquo;{query}&rdquo;</p>
            )}
            {searchResults.map(r => (
              <div key={`${r.book}-${r.chapter}-${r.verse}`} className="bible-editor-result">
                <span className="bible-editor-ref">
                  {r.book_name} {r.chapter}:{r.verse}
                </span>
                <p>{r.text}</p>
                <button onClick={() => handleInsert(r.book, r.chapter, r.verse, r.text, r.book_name)}>
                  + Insert
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Browse panel */}
      {panel === 'browse' && (
        <div className="bible-editor-browse" role="tabpanel">
          <div className="bible-editor-selectors">
            <select
              value={bookNum}
              onChange={e => { setBookNum(Number(e.target.value)); setChapter(1); }}
              aria-label="Select book"
            >
              {books.map(b => (
                <option key={b.number} value={b.number}>{b.name}</option>
              ))}
            </select>

            <select
              value={chapterNum}
              onChange={e => setChapter(Number(e.target.value))}
              aria-label="Select chapter"
            >
              {Array.from({ length: maxChapters }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>Chapter {n}</option>
              ))}
            </select>
          </div>

          <div className="bible-editor-verse-list">
            {verses.map(({ verse, text }) => (
              <div key={verse} className="bible-editor-verse-row">
                <span className="bible-verse-num">{verse}</span>
                <p>{text}</p>
                <button
                  onClick={() => handleInsert(bookNum, chapterNum, verse, text, bookInfo?.name)}
                  aria-label={`Insert ${bookInfo?.name} ${chapterNum}:${verse}`}
                >
                  + Insert
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
```

### 4.11 `bible/index.js` — Public Exports

```js
// Provider
export { BibleProvider, useBible } from './BibleProvider';

// Hooks
export {
  useVerse,
  useChapter,
  useBooks,
  useBookInfo,
  useVerseSearch,
  useBibleReady,
  useTranslation,
} from './useBible';

// Components
export { VerseTag }              from './VerseTag';
export { VerseBlock }            from './VerseBlock';
export { BibleReader }           from './BibleReader';
export { BibleEditor }           from './BibleEditor';
export { BibleDownloadManager }  from './BibleDownloadManager';

// Constants
export {
  BOOKS,
  BOOK_BY_NUMBER,
  BOOK_NUMBER_BY_NAME,
  OLD_TESTAMENT,
  NEW_TESTAMENT,
  DEFAULT_TRANSLATION,
} from './constants';
```

---

## 5. APP INTEGRATION — THE 4 ALLOWED CHANGES

> These are the **only** modifications permitted to existing files outside of `bible/`.

### 5.1 `App.jsx`

```jsx
// Add this import at the top
import { BibleProvider } from './bible';

// Wrap your existing app content — nothing else changes
function App() {
  return (
    <BibleProvider defaultTranslation="KJV">
      {/* YOUR ENTIRE EXISTING APP UNCHANGED BELOW */}
      <Router>
        <Routes>
          {/* all your existing routes */}
        </Routes>
      </Router>
    </BibleProvider>
  );
}
```

**Wrap BibleProvider in an ErrorBoundary so any Bible crash cannot kill the app:**

```jsx
import { Component } from 'react';

class BibleErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err) { console.error('[Bible Module Error]', err); }
  render() {
    if (this.state.hasError) {
      return (
        <>
          <div style={{ padding: '8px', background: '#fff3cd', fontSize: '13px' }}>
            ⚠️ Bible module unavailable. Other features unaffected.
          </div>
          {this.props.children}
        </>
      );
    }
    return this.props.children;
  }
}

// Usage in App.jsx:
function App() {
  return (
    <BibleErrorBoundary>
      <BibleProvider defaultTranslation="KJV">
        {/* existing app */}
      </BibleProvider>
    </BibleErrorBoundary>
  );
}
```

### 5.2 `public/sw.js` — Service Worker

```js
const CACHE_NAME  = 'app-bible-v1';
const BIBLE_CACHE = 'bible-permanent-v1';

// Cache the app shell on install
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(['/', '/index.html'])
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', event => {
  const { url } = event.request;

  // Bible API — Cache Forever (data never changes)
  if (url.includes('/api/bible/')) {
    event.respondWith(
      caches.open(BIBLE_CACHE).then(async cache => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      })
    );
    return;
  }

  // App shell — Cache first, fallback to network
  event.respondWith(
    caches.match(event.request).then(r => r || fetch(event.request))
  );
});
```

**Register in `main.jsx` or `index.js` (new code only, add at the bottom):**

```js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch(err => console.warn('[SW] Registration failed:', err));
  });
}
```

---

## 6. REPLACING HARDCODED VERSES

### Step 1 — Audit First

Before touching any code, run this in the project root to find all hardcoded scripture:

```bash
grep -rn --include="*.jsx" --include="*.js" --include="*.html" --include="*.py" \
  -e "In the beginning" \
  -e "For God so loved" \
  -e "The Lord is my shepherd" \
  -e "John 3:16" \
  -e "Genesis 1:1" \
  . > VERSE_AUDIT.txt

cat VERSE_AUDIT.txt
```

Document every result. Submit list to Lead Engineer before proceeding.

### Step 2 — Replace Each One

**Before:**
```jsx
<p>"For God so loved the world, that he gave his only begotten Son..." — John 3:16</p>
```

**After:**
```jsx
import { VerseBlock } from '../bible';

<VerseBlock book={43} chapter={3} verse={16} />
```

**Book number quick reference (most common):**

| Book | Number |
|---|---|
| Genesis | 1 |
| Psalms | 19 |
| Proverbs | 20 |
| Isaiah | 23 |
| Matthew | 40 |
| John | 43 |
| Romans | 45 |
| 1 Corinthians | 46 |
| Ephesians | 49 |
| Philippians | 50 |
| Revelation | 66 |

> Full list is in `bible/constants.js` → `BOOK_NUMBER_BY_NAME`

---

## 7. TESTING

### 7.1 Run Backend Tests

```bash
cd backend
python manage.py test apps.bible --verbosity=2
```

All 6 tests must pass. Green CI is required before PR.

### 7.2 Manual Acceptance Tests

Run these in the browser **after turning off your network in DevTools (Network tab → Offline)**:

| Test | Expected Result |
|---|---|
| Hard refresh app | App loads, Bible readable |
| Open DevTools Console → `window.__bibleDebug` | Should log verse data if you add a debug hook |
| Navigate to any page with a `<VerseBlock>` | Verse renders with no network |
| Type in BibleEditor search with Offline mode | Results appear instantly, no network request |
| `getVerse(1, 1, 1)` in console | Returns `"In the beginning God created..."` |
| Remove/break BibleProvider | Other pages still load and work |

---

## 8. DATA SOURCE

Download the KJV JSON and place it at `backend/data/kjv.json`:

```
Source:  https://github.com/aruljohn/Bible-kjv
File:    kjv.json
License: Public Domain
```

Then load it:

```bash
cd backend
mkdir -p data
# Place kjv.json in backend/data/
python manage.py load_bible --translation KJV --source data/kjv.json
```

---

## 9. ACCEPTANCE CRITERIA — ALL MUST PASS

| # | Criterion | Verified By |
|---|---|---|
| AC-01 | App loads and displays Bible with zero network after first download | DevTools offline + hard refresh |
| AC-02 | `getVerse(1,1,1,'KJV')` returns correct Genesis 1:1 text | Console + unit test |
| AC-03 | Searching "love" returns ≥10 results with no network calls | Network tab = 0 requests |
| AC-04 | BibleProvider failure does not crash non-Bible pages | Throw in Provider, verify home loads |
| AC-05 | Zero hardcoded verse text remains in existing codebase | `grep` audit = 0 results |
| AC-06 | All 66 books with correct chapter counts present | `getBooks()` in console |
| AC-07 | Adding NIV requires only `downloadTranslation('NIV')` | Browser console test |
| AC-08 | Django admin shows Bible data | `/admin/` → Bible section |
| AC-09 | All backend tests pass | `python manage.py test apps.bible` = green |
| AC-10 | Removing the 4 integration lines + `bible/` folders = zero errors | Test on a branch |

---

## 10. FINAL CHECKLIST — TICK EVERY BOX BEFORE PR

### Backend
- [ ] `apps/bible/__init__.py`
- [ ] `apps/bible/apps.py`
- [ ] `apps/bible/models.py` — Translation, Book, Verse with all indexes
- [ ] `apps/bible/views.py` — all 5 views
- [ ] `apps/bible/urls.py` — all routes
- [ ] `apps/bible/serializers.py`
- [ ] `apps/bible/admin.py`
- [ ] `apps/bible/permissions.py`
- [ ] `apps/bible/tests.py` — all tests passing
- [ ] `apps/bible/management/commands/load_bible.py`
- [ ] `apps/bible/management/commands/clear_bible.py`
- [ ] Migrations created and applied
- [ ] KJV data loaded and verified
- [ ] Redis caching tested

### Frontend
- [ ] `src/bible/constants.js`
- [ ] `src/bible/bibleDB.js` — all 11 functions
- [ ] `src/bible/BibleProvider.jsx` — all state + all functions
- [ ] `src/bible/useBible.js` — all 8 hooks
- [ ] `src/bible/VerseTag.jsx`
- [ ] `src/bible/VerseBlock.jsx`
- [ ] `src/bible/BibleReader.jsx`
- [ ] `src/bible/BibleEditor.jsx`
- [ ] `src/bible/BibleDownloadManager.jsx`
- [ ] `src/bible/BibleNavigator.jsx`
- [ ] `src/bible/VerseSearch.jsx`
- [ ] `src/bible/index.js`
- [ ] `public/sw.js`
- [ ] SW registered in `main.jsx`
- [ ] `BibleProvider` + `BibleErrorBoundary` in `App.jsx`
- [ ] All hardcoded verses replaced
- [ ] `idb` and `@tanstack/react-query` installed

### Documentation
- [ ] `src/bible/README.md` — setup, commands, how to add translations
- [ ] Hardcoded verse audit doc submitted
- [ ] PR description lists every file changed with reason

---

## ⛔ WHAT COPILOT MUST NOT DO

| ❌ Forbidden | ✅ Required |
|---|---|
| Generate `TODO` or `pass` stubs | Implement every function completely |
| Use `localStorage` instead of IndexedDB | Use `idb` with IndexedDB as specified |
| Fetch a verse one-at-a-time from the API | Download entire translation once |
| Modify any existing model, view, or component | Only create new files inside `bible/` |
| Skip Redis caching on any read endpoint | Cache every GET with 365-day TTL |
| Rename files or change directory structure | Follow Section 2 exactly |
| Change the API response JSON shape | Use nested `book/chapter/verse` structure |
| Make verse reads async/await | Verse reads are **synchronous** from memory |
| Skip tests | Write all tests in Section 7 |
| Add Bible imports to existing files beyond the 4 in Section 5 | Keep module isolated |

---

*Lead Engineer Specification v1.0 — BINDING — Do not modify without Lead Engineer approval.*
