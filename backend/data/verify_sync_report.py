import sqlite3
import json
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

def main():
    conn = sqlite3.connect('backend/smartpick.db')
    c = conn.cursor()

    # 1. Total products count
    c.execute('SELECT COUNT(*) FROM products')
    total_products = c.fetchone()[0]

    # 2. Verify catalog_updated_at = today
    c.execute('SELECT catalog_updated_at, COUNT(*) FROM products GROUP BY catalog_updated_at')
    catalog_dates = c.fetchall()

    # 3. Total price history count
    c.execute('SELECT COUNT(*) FROM price_history')
    import datetime
    from pathlib import Path
    today_str = datetime.date.today().isoformat()

    total_history = c.fetchone()[0]

    # 4. Check price history entries per product for today
    c.execute('SELECT product_id, COUNT(*) FROM price_history WHERE date(recorded_at) = ? GROUP BY product_id', (today_str,))
    history_today_per_prod = c.fetchall()

    # Load before snapshot if available, else fallback to pre_sync_snapshot_20261015.json or pre_sync_prices.json or price_history
    before_snap = {}
    snap_candidates = [
        Path(f'pre_sync_snapshot_{today_str.replace("-", "")}.json'),
        Path('pre_sync_snapshot_20261016.json'),
        Path('pre_sync_snapshot_20261015.json'),
        Path('temp_current_prices_before_sync.json'),
        Path('pre_sync_prices.json'),
    ]
    for p in snap_candidates:
        if p.exists():
            with open(p, 'r', encoding='utf-8') as f:
                loaded = json.load(f)
                if 'products' in loaded:
                    before_snap = loaded['products']
                else:
                    before_snap = loaded
                break

    if not before_snap:
        # Fallback to previous day's price history
        c.execute('''
            SELECT p.id, p.name, p.brand, p.category, ph.price
            FROM products p
            JOIN price_history ph ON p.id = ph.product_id
            WHERE date(ph.recorded_at) < ?
            GROUP BY p.id
            HAVING ph.recorded_at = MAX(ph.recorded_at)
        ''', (today_str,))
        for r in c.fetchall():
            before_snap[r[0]] = {'name': r[1], 'brand': r[2], 'category': r[3], 'price': r[4]}

    # Fetch current products
    c.execute('SELECT id, name, brand, category, price, catalog_updated_at FROM products')
    after_rows = c.fetchall()
    after_snap = {r[0]: {'name': r[1], 'brand': r[2], 'category': r[3], 'price': r[4], 'catalog_updated_at': r[5]} for r in after_rows}

    # Compare before vs after this run
    increases = []
    drops = []
    unchanged = []
    cat_stats = {}

    for pid, before in before_snap.items():
        after = after_snap[pid]
        old_p = before['price']
        new_p = after['price']
        cat = before['category']
        if cat not in cat_stats:
            cat_stats[cat] = {'total': 0, 'increases': 0, 'drops': 0, 'unchanged': 0, 'pct_changes': []}
        cat_stats[cat]['total'] += 1
        
        pct = ((new_p - old_p) / old_p) * 100 if old_p > 0 else 0.0
        cat_stats[cat]['pct_changes'].append(pct)
        
        item_info = {
            'id': pid,
            'name': before['name'],
            'brand': before['brand'],
            'category': cat,
            'old_price': old_p,
            'new_price': new_p,
            'diff': round(new_p - old_p, 2),
            'pct_change': round(pct, 2)
        }
        
        if new_p > old_p:
            increases.append(item_info)
            cat_stats[cat]['increases'] += 1
        elif new_p < old_p:
            drops.append(item_info)
            cat_stats[cat]['drops'] += 1
        else:
            unchanged.append(item_info)
            cat_stats[cat]['unchanged'] += 1

    increases.sort(key=lambda x: x['pct_change'], reverse=True)
    drops.sort(key=lambda x: x['pct_change'])

    print("=== VERIFICATION SUMMARY ===")
    print(f"Total Products in DB: {total_products}")
    print(f"Catalog Updated At distribution: {catalog_dates}")
    print(f"Total Price History Records: {total_history}")
    print(f"Products with history entries on {today_str}: {len(history_today_per_prod)} / {total_products}")
    print(f"Price Increases: {len(increases)}")
    print(f"Price Drops: {len(drops)}")
    print(f"Unchanged: {len(unchanged)}")

    all_pcts = [item['pct_change'] for item in increases + drops + unchanged]
    avg_pct = sum(all_pcts) / len(all_pcts) if all_pcts else 0.0
    print(f"Overall Average Price Change: {avg_pct:.2f}%")

    print("\n=== CATEGORY BREAKDOWN ===")
    for cat, s in sorted(cat_stats.items()):
        cat_avg = sum(s['pct_changes']) / len(s['pct_changes']) if s['pct_changes'] else 0.0
        print(f"  - {cat.upper()}: total={s['total']}, increases={s['increases']}, drops={s['drops']}, unchanged={s['unchanged']}, avg_change={cat_avg:+.2f}%")

    print("\n=== TOP 10 PRICE INCREASES ===")
    for idx, item in enumerate(increases[:10], 1):
        print(f"  {idx}. {item['name']} [{item['brand']} | {item['category']}]: Rs.{item['old_price']:,.0f} -> Rs.{item['new_price']:,.0f} (+Rs.{item['diff']:,.0f}, +{item['pct_change']}%)")

    print("\n=== TOP 10 PRICE DROPS ===")
    for idx, item in enumerate(drops[:10], 1):
        print(f"  {idx}. {item['name']} [{item['brand']} | {item['category']}]: Rs.{item['old_price']:,.0f} -> Rs.{item['new_price']:,.0f} (Rs.{item['diff']:,.0f}, {item['pct_change']}%)")

if __name__ == '__main__':
    main()
