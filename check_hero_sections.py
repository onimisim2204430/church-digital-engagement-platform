#!/usr/bin/env python
import sqlite3
import os

db_path = "backend/db.sqlite3"

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check if the table exists
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='content_herosection'")
table_exists = cursor.fetchone()
print(f"Table exists: {table_exists is not None}")

if not table_exists:
    # Show all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = cursor.fetchall()
    print(f"\nAvailable tables ({len(tables)}):")
    for table in tables:
        print(f"  - {table[0]}")
else:
    # Get table info
    cursor.execute("PRAGMA table_info(content_herosection)")
    columns = cursor.fetchall()
    print(f"\nTable columns:")
    for col in columns:
        print(f"  - {col[1]} ({col[2]})")

    # Count rows
    cursor.execute("SELECT COUNT(*) FROM content_herosection")
    count = cursor.fetchone()[0]
    print(f"\nTotal rows: {count}")
    
    if count > 0:
        cursor.execute("SELECT * FROM content_herosection LIMIT 5")
        rows = cursor.fetchall()
        for row in rows:
            print(f"Row: {row}")

conn.close()
