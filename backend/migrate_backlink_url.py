"""
Migration script: rename column source_href -> backlink_url in backlinks table
Run with: docker compose exec backend python3 migrate_backlink_url.py
"""
from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text(
        "ALTER TABLE backlinks CHANGE source_href backlink_url VARCHAR(500) NOT NULL"
    ))
    conn.commit()
    print("Migration done: source_href -> backlink_url")
