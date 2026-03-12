#!/usr/bin/env python
"""
Check all content types in the database
Shows both system (hardcoded) and custom-created types
"""
import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'db.sqlite3')

if not os.path.exists(db_path):
    print("❌ Database not found!")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Query all content types
cursor.execute("""
    SELECT id, slug, name, is_system, is_enabled, sort_order, created_at, updated_at
    FROM content_postcontenttype 
    ORDER BY sort_order, name
""")

rows = cursor.fetchall()

print("\n" + "=" * 120)
print("📊 ALL CONTENT TYPES IN DATABASE")
print("=" * 120)
print(f"\nTotal: {len(rows)} content types\n")

# Header
print(f"{'ID':<38} {'Slug':<18} {'Name':<25} {'Type':<12} {'Status':<10} {'Order':<8}")
print("-" * 120)

# Display each content type
for row in rows:
    id_val, slug, name, is_system, is_enabled, sort_order, created, updated = row
    type_label = "SYSTEM" if is_system else "CUSTOM"
    status = "Enabled" if is_enabled else "Disabled"
    
    print(f"{id_val:<38} {slug:<18} {name:<25} {type_label:<12} {status:<10} {sort_order:<8}")

# Summary statistics
print("\n" + "=" * 120)
print("📈 SUMMARY STATISTICS")
print("=" * 120)
print(f"System Types (hardcoded):     {sum(1 for r in rows if r[3])}")
print(f"Custom Types (admin-created): {sum(1 for r in rows if not r[3])}")
print(f"Enabled Types:                {sum(1 for r in rows if r[4])}")
print(f"Disabled Types:               {sum(1 for r in rows if not r[4])}")

# Count posts per content type
print("\n" + "=" * 120)
print("📝 POST COUNTS PER CONTENT TYPE")
print("=" * 120)

cursor.execute("""
    SELECT 
        ct.slug,
        ct.name,
        COUNT(p.id) as post_count,
        SUM(CASE WHEN p.status = 'PUBLISHED' AND p.published_at <= datetime('now') THEN 1 ELSE 0 END) as published_count
    FROM content_postcontenttype ct
    LEFT JOIN content_post p ON p.content_type_id = ct.id AND p.is_deleted = 0
    GROUP BY ct.id, ct.slug, ct.name
    ORDER BY published_count DESC, post_count DESC
""")

post_counts = cursor.fetchall()

print(f"{'Slug':<18} {'Name':<25} {'Total Posts':<15} {'Published Posts':<15}")
print("-" * 120)

for slug, name, total, published in post_counts:
    print(f"{slug:<18} {name:<25} {total:<15} {published:<15}")

print("\n" + "=" * 120)

conn.close()
