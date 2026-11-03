"""Production Catalog Sanitization, Price Restoration, and Vector Re-indexing."""
import sys
import sqlite3
import json
from pathlib import Path
import pandas as pd

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

backend_path = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_path))

from app.database import SessionLocal, init_db
from app.models import Product, PriceHistory
from app.services.vector_service import generate_text_embedding, create_product_document, semantic_engine

CSV_PATH = backend_path / "data" / "laptops_india_catalog.csv"

CATEGORY_MIN_PRICES = {
    "laptop": 19990.0,
    "smartphone": 5990.0,
    "tablet": 7990.0,
    "monitor": 4990.0,
    "gaming": 14990.0,
    "smartwatch": 1490.0,
    "audio": 499.0,
    "accessory": 199.0
}

def sanitize_and_restore():
    print("=" * 70)
    print("🔧 STARTING CATALOG SANITIZATION & PRICE RESTORATION")
    print("=" * 70)

    init_db()
    db = SessionLocal()

    # 1. Load pristine catalog prices from CSV
    csv_df = pd.read_csv(CSV_PATH)
    csv_price_map = dict(zip(csv_df['id'], csv_df['price']))
    print(f"[INFO] Loaded {len(csv_price_map)} pristine prices from {CSV_PATH.name}")

    # 2. Get baseline prices from earliest backfill in price_history
    backfill_rows = db.query(PriceHistory.product_id, PriceHistory.price).filter(
        PriceHistory.source == 'market_history_backfill'
    ).order_by(PriceHistory.recorded_at.asc()).all()
    
    backfill_price_map = {}
    for pid, price in backfill_rows:
        if pid not in backfill_price_map and price > 0:
            backfill_price_map[pid] = price
    print(f"[INFO] Loaded {len(backfill_price_map)} baseline backfill prices")

    # 3. Purge / Re-classify fake accessories
    fake_keywords = [
        'backpack', 'mouse pad', 'mousepad', 'charger fit', 'power supply adapter',
        'replacement ac adapter', 'sleeve', 'travel bag', 'bookbag', 'usb c to hdmi',
        'keyboard and mouse combo', 'projector', 'monopod', 'tripod', 'mount holder',
        'bike mount', 'replacement accessories bands', 'replacement band', 'sport loop band',
        'snowflake band', 'leather accessories for fitbit', 'silicone replacement',
        'headphone adapter, 3 in 1', 'bullet outdoor security camera', 'socket mount',
        'fast charger, kashimura', 'selfie stick'
    ]

    all_products = db.query(Product).all()
    reclassified_count = 0
    price_restored_count = 0
    embedded_count = 0

    for p in all_products:
        p_name_lower = p.name.lower()
        is_fake_non_accessory = (
            p.category in ('laptop', 'smartphone', 'smartwatch', 'tablet') and
            any(kw in p_name_lower for kw in fake_keywords)
        )

        if is_fake_non_accessory:
            p.category = "accessory"
            p.ram_gb = 0
            p.storage_gb = 0
            p.processor = "Peripheral Controller"
            p.gpu = "None"
            p.display_tech = "N/A"
            p.ram_expandability = "N/A"
            reclassified_count += 1

        # Determine target authentic price
        target_price = None
        if p.id in csv_price_map:
            target_price = float(csv_price_map[p.id])
        elif p.id in backfill_price_map:
            target_price = float(backfill_price_map[p.id])
        
        # If price is still low or missing, clamp to category minimum
        cat = p.category.lower()
        floor = CATEGORY_MIN_PRICES.get(cat, 199.0)
        if target_price is None or target_price < floor:
            target_price = floor

        if abs(p.price - target_price) > 1.0 or p.price <= 99.0:
            p.price = target_price
            price_restored_count += 1

        # Generate dense 384-dim semantic embedding
        doc_text = create_product_document(p)
        emb_vector = generate_text_embedding(doc_text, dim=384)
        p.embedding = emb_vector
        embedded_count += 1

    db.commit()

    print(f"[SUCCESS] Reclassified {reclassified_count} bogus accessories to 'accessory' with 0 RAM/SSD.")
    print(f"[SUCCESS] Restored authentic Indian street prices for {price_restored_count} products.")
    print(f"[SUCCESS] Generated 384-dimensional dense embeddings for {embedded_count} products.")

    # Re-index semantic vector engine
    all_prods = db.query(Product).all()
    semantic_engine.index_products(all_prods)
    print(f"[SUCCESS] Semantic search engine re-indexed with {len(all_prods)} valid items.")
    db.close()

if __name__ == "__main__":
    sanitize_and_restore()
