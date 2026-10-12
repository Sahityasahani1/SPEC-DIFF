"""Standalone CLI runner for Daily Market Price Synchronization.
Can be executed manually or triggered by any task scheduler (Cron / Windows Task Scheduler / Sidecar).
Usage:
    python backend/data/sync_daily_market_prices.py [--backfill]
"""
import sys
import argparse
from pathlib import Path

# Ensure UTF-8 stdout
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

backend_path = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_path))

from app.database import SessionLocal, init_db
from app.models import Product
from app.services.market_price_service import sync_catalog_market_prices, seed_initial_price_history_if_empty
from app.services.vector_service import semantic_engine

def run_sync(backfill: bool = False):
    print("=" * 70)
    print("📈 SPECDIFF DAILY REAL-MARKET PRICE SYNCHRONIZER")
    print("=" * 70)

    init_db()
    db = SessionLocal()
    try:
        if backfill:
            print("[INFO] Checking 30-day price history backfill...")
            cnt = seed_initial_price_history_if_empty(db, days=30)
            print(f"[INFO] History records present: {cnt}")

        print("[INFO] Fetching current real-market prices across catalog...")
        result = sync_catalog_market_prices(db)

        print("\n" + "=" * 70)
        print("✅ DAILY MARKET PRICE SYNC COMPLETE")
        print(f"   Date:               {result.get('synced_at')}")
        print(f"   Total Products:     {result.get('total_products')}")
        print(f"   Updated Products:   {result.get('updated_count')}")
        print(f"   Average Change:     {result.get('avg_price_change_pct')}%")
        print(f"   Price Increases:    {result.get('price_increases')}")
        print(f"   Price Drops:        {result.get('price_drops')}")
        print(f"   Data Sources Used:  {result.get('sources')}")
        print("=" * 70)

        # Reindex vector semantic engine
        print("[INFO] Re-indexing semantic vector engine with new prices...")
        all_products = db.query(Product).all()
        semantic_engine.index_products(all_products)
        print("[SUCCESS] Semantic search engine re-indexed.")

    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sync daily real market prices")
    parser.add_argument("--backfill", action="store_true", help="Backfill 30-day history if empty")
    args = parser.parse_args()
    run_sync(backfill=args.backfill)
