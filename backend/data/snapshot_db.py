import sqlite3
import json
import datetime
from pathlib import Path

conn = sqlite3.connect('backend/smartpick.db')
c = conn.cursor()

c.execute('SELECT COUNT(*) FROM products')
total_products = c.fetchone()[0]

c.execute('SELECT COUNT(*) FROM price_history')
history_count = c.fetchone()[0]

c.execute('SELECT id, name, brand, category, price, catalog_updated_at FROM products')
rows = c.fetchall()
products = {r[0]: {'name': r[1], 'brand': r[2], 'category': r[3], 'price': r[4], 'catalog_updated_at': r[5]} for r in rows}

today_str = datetime.date.today().isoformat()
c.execute("SELECT product_id, count(*) FROM price_history WHERE date(recorded_at) = ? GROUP BY product_id", (today_str,))
today_history_entries = {r[0]: r[1] for r in c.fetchall()}

snapshot = {
    'timestamp': datetime.datetime.now().isoformat(),
    'today_str': today_str,
    'total_products': total_products,
    'history_count': history_count,
    'today_history_entries_count': len(today_history_entries),
    'products': products
}

with open('pre_run_snapshot.json', 'w', encoding='utf-8') as f:
    json.dump(snapshot, f, indent=2)

print(f'Snapshot captured: {total_products} products, {history_count} total price_history records, {len(today_history_entries)} with history for {today_str}')
conn.close()
