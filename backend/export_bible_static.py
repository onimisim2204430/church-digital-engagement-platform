"""
Run this from the backend directory:
  python export_bible_static.py

Exports the KJV data already in the database into the correct static JSON
format and places it at public/bibles/kjv.json for the React frontend.
"""
import os, sys, json, django
from pathlib import Path

# Setup Django
sys.path.insert(0, str(Path(__file__).parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.bible.models import Translation, Book, Verse

OUTPUT_PATH = Path(__file__).parent.parent / 'public' / 'bibles' / 'kjv.json'
OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

print("Exporting KJV from database...")

try:
    translation = Translation.objects.get(code='KJV')
except Translation.DoesNotExist:
    print("ERROR: KJV not found in database. Run: python manage.py load_bible first.")
    sys.exit(1)

# Build nested structure: { bookNum: { chapterNum: { verseNum: text } } }
bible_data = {}
total = 0

verses = (Verse.objects
    .filter(translation=translation)
    .select_related('book')
    .order_by('book_number', 'chapter', 'verse'))

for v in verses:
    b = str(v.book_number)
    c = str(v.chapter)
    vn = str(v.verse)
    if b not in bible_data:
        bible_data[b] = {}
    if c not in bible_data[b]:
        bible_data[b][c] = {}
    bible_data[b][c][vn] = v.text
    total += 1

# Also build books metadata
books_data = {}
for book in Book.objects.filter(translation=translation).order_by('number'):
    books_data[str(book.number)] = {
        "name": book.name,
        "abbreviation": book.abbreviation,
        "testament": book.testament,
        "chapters": book.chapter_count
    }

output = {
    "translation": "KJV",
    "name": "King James Version",
    "books": books_data,
    "verses": bible_data
}

with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, separators=(',', ':'))

size_mb = OUTPUT_PATH.stat().st_size / (1024 * 1024)
print(f"✅ Exported {total} verses to {OUTPUT_PATH}")
print(f"   File size: {size_mb:.2f} MB")
print(f"   Books: {len(books_data)}")
