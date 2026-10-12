"""Sync SQLite image_url values to laptops_india_catalog.csv so the CSV also has exact image_url column."""
import sys
import csv
from pathlib import Path

backend_path = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_path))

from app.database import SessionLocal
from app.models import Product

CSV_PATH = backend_path / "data" / "laptops_india_catalog.csv"

def sync_csv():
    db = SessionLocal()
    products = db.query(Product).all()
    id_to_img = {p.id: p.image_url for p in products}

    if not CSV_PATH.exists():
        print("CSV does not exist.")
        return

    with open(CSV_PATH, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames or [])
        rows = list(reader)

    if "image_url" not in fieldnames:
        fieldnames.append("image_url")

    updated_count = 0
    for r in rows:
        pid = r.get("id")
        if pid in id_to_img and id_to_img[pid]:
            r["image_url"] = id_to_img[pid]
            updated_count += 1
        else:
            r["image_url"] = r.get("image_url", "")

    with open(CSV_PATH, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Updated CSV: {updated_count} rows with image_url out of {len(rows)} total rows.")

if __name__ == "__main__":
    sync_csv()
