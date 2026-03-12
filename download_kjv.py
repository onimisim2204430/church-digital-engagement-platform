import urllib.request
import json
from pathlib import Path

print("Downloading KJV Bible...")

# Use Bible API to download all books
base_url = "https://bible-api.com"
books = [
    ("Genesis", 50), ("Exodus", 40), ("Leviticus", 27), ("Numbers", 36), 
    ("Deuteronomy", 34), ("Joshua", 24), ("Judges", 21), ("Ruth", 4),
    ("1Samuel", 31), ("2Samuel", 24), ("1Kings", 22), ("2Kings", 25),
    ("1Chronicles", 29), ("2Chronicles", 36), ("Ezra", 10), ("Nehemiah", 13),
    ("Esther", 10), ("Job", 42), ("Psalms", 150), ("Proverbs", 31),
    ("Ecclesiastes", 12), ("SongofSolomon", 8), ("Isaiah", 66), ("Jeremiah", 52),
    ("Lamentations", 5), ("Ezekiel", 48), ("Daniel", 12), ("Hosea", 14),
    ("Joel", 3), ("Amos", 9), ("Obadiah", 1), ("Jonah", 4),
    ("Micah", 7), ("Nahum", 3), ("Habakkuk", 3), ("Zephaniah", 3),
    ("Haggai", 2), ("Zechariah", 14), ("Malachi", 4), ("Matthew", 28),
    ("Mark", 16), ("Luke", 24), ("John", 21), ("Acts", 28),
    ("Romans", 16), ("1Corinthians", 16), ("2Corinthians", 13), ("Galatians", 6),
    ("Ephesians", 6), ("Philippians", 4), ("Colossians", 4), ("1Thessalonians", 5),
    ("2Thessalonians", 3), ("1Timothy", 6), ("2Timothy", 4), ("Titus", 3),
    ("Philemon", 1), ("Hebrews", 13), ("James", 5), ("1Peter", 5),
    ("2Peter", 3), ("1John", 5), ("2John", 1), ("3John", 1),
    ("Jude", 1), ("Revelation", 22)
]

merged = {}
total_verses = 0

for book_name, chapter_count in books:
    print(f"Downloading {book_name}...", end=" ", flush=True)
    book_data = {"chapters": []}
    
    try:
        for ch in range(1, chapter_count + 1):
            # Download chapter from bible-api.com
            url = f"https://bible-api.com/{book_name.replace('Song', 'Song of Solomon').replace('1', '1 ').replace('2', '2 ').replace('3', '3 ')} {ch}?translation=kjv"
            
            try:
                with urllib.request.urlopen(url, timeout=10) as response:
                    chapter_data = json.loads(response.read().decode('utf-8'))
                
                # Extract verses
                verses = []
                if 'verses' in chapter_data:
                    for v in chapter_data['verses']:
                        verses.append({"text": v['text'].strip()})
                        total_verses += 1
                
                book_data["chapters"].append(verses)
            except Exception as e:
                print(f"\n  Chapter {ch} failed: {e}")
                break
        
        merged[book_name] = book_data
        print(f"OK ({len(book_data['chapters'])} chapters)")
        
    except Exception as e:
        print(f"FAILED: {e}")

# Save to file
output_path = Path("public/bibles/kjv_raw.json")
output_path.parent.mkdir(parents=True, exist_ok=True)

with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(merged, f, ensure_ascii=False, indent=2)

size_mb = output_path.stat().st_size / 1024 / 1024
print(f"\n✅ Done!")
print(f"File: {output_path}")
print(f"Size: {size_mb:.2f} MB")
print(f"Books: {len(merged)}/66")
print(f"Total verses: {total_verses}")
