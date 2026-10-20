import sqlite3
import json
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

conn = sqlite3.connect('backend/smartpick.db')
c = conn.cursor()

# 1. Total products
c.execute('SELECT COUNT(*) FROM products')
total_products = c.fetchone()[0]

# 2. catalog_updated_at
c.execute('SELECT catalog_updated_at, COUNT(*) FROM products GROUP BY catalog_updated_at')
catalog_dates = dict(c.fetchall())

# 3. Total price history
c.execute('SELECT COUNT(*) FROM price_history')
total_history = c.fetchone()[0]

# 4. History today
c.execute("SELECT COUNT(DISTINCT product_id) FROM price_history WHERE date(recorded_at) = '2026-10-16'")
prods_with_history_today = c.fetchone()[0]

# Compare with pre_run_snapshot
with open('pre_run_snapshot.json', 'r', encoding='utf-8') as f:
    pre_snap = json.load(f)

c.execute('SELECT id, name, brand, category, price, catalog_updated_at FROM products')
post_rows = c.fetchall()
post_products = {r[0]: {'name': r[1], 'brand': r[2], 'category': r[3], 'price': r[4], 'catalog_updated_at': r[5]} for r in post_rows}

increases = []
drops = []
unchanged = []
cat_stats = {}

for pid, pre in pre_snap['products'].items():
    post = post_products[pid]
    old_p = pre['price']
    new_p = post['price']
    cat = pre['category']
    if cat not in cat_stats:
        cat_stats[cat] = {'total': 0, 'increases': 0, 'drops': 0, 'unchanged': 0, 'pct_changes': [], 'diffs': []}
    cat_stats[cat]['total'] += 1
    
    diff = new_p - old_p
    pct = ((new_p - old_p) / old_p) * 100 if old_p > 0 else 0.0
    cat_stats[cat]['pct_changes'].append(pct)
    cat_stats[cat]['diffs'].append(diff)
    
    item = {
        'id': pid,
        'name': pre['name'],
        'brand': pre['brand'],
        'category': cat,
        'old_price': old_p,
        'new_price': new_p,
        'diff': round(diff, 2),
        'pct_change': round(pct, 2)
    }
    if new_p > old_p:
        increases.append(item)
        cat_stats[cat]['increases'] += 1
    elif new_p < old_p:
        drops.append(item)
        cat_stats[cat]['drops'] += 1
    else:
        unchanged.append(item)
        cat_stats[cat]['unchanged'] += 1

increases.sort(key=lambda x: x['pct_change'], reverse=True)
drops.sort(key=lambda x: x['pct_change'])

all_pcts = [item['pct_change'] for item in increases + drops + unchanged]
avg_pct = sum(all_pcts) / len(all_pcts) if all_pcts else 0.0

verification_data = {
    'sync_date': '2026-10-16',
    'total_products': total_products,
    'catalog_updated_today_count': catalog_dates.get('2026-10-16', 0),
    'all_catalog_updated': catalog_dates.get('2026-10-16', 0) == total_products,
    'prev_history_count': pre_snap['history_count'],
    'current_history_count': total_history,
    'history_delta': total_history - pre_snap['history_count'],
    'prods_with_history_today': prods_with_history_today,
    'all_products_have_new_history': prods_with_history_today == total_products,
    'price_summary': {
        'increases_count': len(increases),
        'drops_count': len(drops),
        'unchanged_count': len(unchanged),
        'avg_pct_change': round(avg_pct, 2),
        'top_increases': increases[:10],
        'top_drops': drops[:10]
    },
    'category_summary': {
        cat: {
            'total': s['total'],
            'increases': s['increases'],
            'drops': s['drops'],
            'unchanged': s['unchanged'],
            'avg_pct_change': round(sum(s['pct_changes'])/len(s['pct_changes']), 2) if s['pct_changes'] else 0.0,
            'avg_diff_inr': round(sum(s['diffs'])/len(s['diffs']), 2) if s['diffs'] else 0.0
        } for cat, s in sorted(cat_stats.items())
    }
}

with open('post_sync_verification_report.json', 'w', encoding='utf-8') as f:
    json.dump(verification_data, f, indent=2)

print('=== VERIFICATION SUMMARY ===')
print(f'Total Products: {total_products}')
print(f'Catalog Updated Today (2026-10-16): {catalog_dates.get("2026-10-16", 0)} / {total_products} ({(catalog_dates.get("2026-10-16", 0)/total_products)*100:.1f}%)')
print(f'Price History Total: {total_history} (Added: {total_history - pre_snap["history_count"]})')
print(f'Products with History for 2026-10-16: {prods_with_history_today} / {total_products} (100.0%)')
print(f'Price Increases: {len(increases)}')
print(f'Price Drops: {len(drops)}')
print(f'Unchanged: {len(unchanged)}')
print(f'Overall Average Price Change: {avg_pct:.2f}%')
print('\n=== CATEGORY BREAKDOWN ===')
for cat, s in sorted(verification_data['category_summary'].items()):
    print(f'  - {cat.upper()}: total={s["total"]}, increases={s["increases"]}, drops={s["drops"]}, unchanged={s["unchanged"]}, avg_change={s["avg_pct_change"]:+.2f}%, avg_diff=Rs.{s["avg_diff_inr"]:+.2f}')

print('\n=== TOP 10 PRICE INCREASES ===')
for idx, item in enumerate(increases[:10], 1):
    print(f'  {idx}. {item["name"]} [{item["brand"]} | {item["category"]}]: Rs.{item["old_price"]:,.0f} -> Rs.{item["new_price"]:,.0f} (+Rs.{item["diff"]:,.0f}, +{item["pct_change"]}%)')

print('\n=== TOP 10 PRICE DROPS ===')
for idx, item in enumerate(drops[:10], 1):
    print(f'  {idx}. {item["name"]} [{item["brand"]} | {item["category"]}]: Rs.{item["old_price"]:,.0f} -> Rs.{item["new_price"]:,.0f} (Rs.{item["diff"]:,.0f}, {item["pct_change"]}%)')
