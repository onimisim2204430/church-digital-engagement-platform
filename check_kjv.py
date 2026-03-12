import json
from pathlib import Path

kjv_path = Path("public/bibles/kjv.json")

if not kjv_path.exists():
    print("❌ kjv.json not found")
    exit(1)

print(f"File size: {kjv_path.stat().st_size / 1024 / 1024:.2f} MB")

with open(kjv_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

if 'verses' in data:
    books = len(data['verses'])
    total_verses = sum(len(vv) for b in data['verses'].values() for vv in b.values())
    
    print(f"✅ Structure: New format with 'verses' key")
    print(f"Books: {books}")
    print(f"Total verses: {total_verses}")
    print(f"Has 'books' metadata: {'books' in data}")
    
    if '1' in data['verses'] and '1' in data['verses']['1'] and '1' in data['verses']['1']['1']:
        print(f"Sample (Genesis 1:1): {data['verses']['1']['1']['1'][:60]}...")
    
    if total_verses > 30000:
        print("\n✅ SUCCESS: File contains full Bible data!")
    else:
        print(f"\n⚠️  WARNING: Only {total_verses} verses (expected ~31,102)")
else:
    print("❌ No 'verses' key found in data")
    print(f"Top-level keys: {list(data.keys())}")
