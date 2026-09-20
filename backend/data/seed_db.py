"""Seed Database Script."""
import os
import sys
from pathlib import Path

# Ensure UTF-8 stdout on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add backend to sys.path
backend_path = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_path))

from app.database import init_db, SessionLocal
from app.services.catalog_service import import_csv_catalog
from app.config import DEFAULT_CSV_PATH

def run_seed():
    print("[INFO] Initializing SQLite database...")
    init_db()

    db = SessionLocal()
    try:
        if not DEFAULT_CSV_PATH.exists():
            print(f"[ERROR] CSV file not found at {DEFAULT_CSV_PATH}")
            return

        with open(DEFAULT_CSV_PATH, mode="r", encoding="utf-8-sig") as f:
            content = f.read()

        print(f"[INFO] Ingesting Indian laptop catalog from {DEFAULT_CSV_PATH.name}...")
        res = import_csv_catalog(db, content)
        print(f"[SUCCESS] Ingestion complete! Status: {res.status}")
        print(f"          Imported: {res.imported_count} products | Rejected: {res.rejected_count}")
        if res.errors:
            for err in res.errors:
                print(f"          Row {err.row_number} ({err.sku}): {err.error}")
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
