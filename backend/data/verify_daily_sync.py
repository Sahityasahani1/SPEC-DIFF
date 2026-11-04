import sys
import sqlite3
import json
from collections import defaultdict
from datetime import datetime

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

conn = sqlite3.connect('backend/smartpick.db')
c = conn.cursor()

# 1. Product count
c.execute('SELECT COUNT(*) FROM products')
total_prods = c.fetchone()[0]

# 2. catalog_updated_at distribution
c.execute('SELECT catalog_updated_at, COUNT(*) FROM products GROUP BY catalog_updated_at')
catalog_dates = dict(c.fetchall())

# 3. Total history count
c.execute('SELECT COUNT(*) FROM price_history')
total_history = c.fetchone()[0]

# 4. History for today
today_str = datetime.now().strftime('%Y-%m-%d')
c.execute('SELECT COUNT(*), COUNT(DISTINCT product_id) FROM price_history WHERE date(recorded_at) = ?', (today_str,))
today_total_hist, today_distinct_prods = c.fetchone()

# 5. Missing history
c.execute('''
    SELECT COUNT(*) FROM products p
    WHERE NOT EXISTS (
        SELECT 1 FROM price_history ph
        WHERE ph.product_id = p.id AND date(ph.recorded_at) = ?
    )
''', (today_str,))
missing_hist = c.fetchone()[0]

# Load pre-run snapshot
with open('pre_run_snapshot.json', 'r', encoding='utf-8') as f:
    pre_snap = json.load(f)

c.execute('SELECT id, name, brand, category, price, catalog_updated_at FROM products')
post_rows = c.fetchall()
post_products = {r[0]: {'name': r[1], 'brand': r[2], 'category': r[3], 'price': r[4], 'catalog_updated_at': r[5]} for r in post_rows}

changes = []
cat_stats = defaultdict(lambda: {'count': 0, 'increases': 0, 'drops': 0, 'unchanged': 0, 'pcts': [], 'diffs': [], 'prices': []})
brand_stats = defaultdict(lambda: {'count': 0, 'pcts': [], 'diffs': []})

for pid, post in post_products.items():
    pre = pre_snap['products'][pid]
    old_p = pre['price']
    new_p = post['price']
    diff = new_p - old_p
    pct = ((new_p - old_p) / old_p) * 100 if old_p > 0 else 0.0
    cat = post['category']
    brand = post['brand']
    
    cat_stats[cat]['count'] += 1
    cat_stats[cat]['pcts'].append(pct)
    cat_stats[cat]['diffs'].append(diff)
    cat_stats[cat]['prices'].append(new_p)
    if new_p > old_p:
        cat_stats[cat]['increases'] += 1
    elif new_p < old_p:
        cat_stats[cat]['drops'] += 1
    else:
        cat_stats[cat]['unchanged'] += 1
        
    brand_stats[brand]['count'] += 1
    brand_stats[brand]['pcts'].append(pct)
    brand_stats[brand]['diffs'].append(diff)
    
    changes.append({
        'id': pid,
        'name': post['name'],
        'brand': brand,
        'category': cat,
        'old_price': old_p,
        'new_price': new_p,
        'diff': round(diff, 2),
        'pct_change': round(pct, 2)
    })

increases = [c for c in changes if c['diff'] > 0]
drops = [c for c in changes if c['diff'] < 0]
unchanged = [c for c in changes if c['diff'] == 0]

increases.sort(key=lambda x: x['diff'], reverse=True)
drops.sort(key=lambda x: x['diff'])

all_pcts = [c['pct_change'] for c in changes]
all_diffs = [c['diff'] for c in changes]
avg_pct = sum(all_pcts) / len(all_pcts) if all_pcts else 0.0
avg_diff = sum(all_diffs) / len(all_diffs) if all_diffs else 0.0

category_summary = {}
for cat, d in sorted(cat_stats.items()):
    category_summary[cat] = {
        'total': d['count'],
        'increases': d['increases'],
        'drops': d['drops'],
        'unchanged': d['unchanged'],
        'avg_pct_change': round(sum(d['pcts']) / len(d['pcts']), 2) if d['pcts'] else 0.0,
        'avg_diff_inr': round(sum(d['diffs']) / len(d['diffs']), 2) if d['diffs'] else 0.0,
        'min_price': round(min(d['prices']), 2),
        'max_price': round(max(d['prices']), 2),
        'avg_price': round(sum(d['prices']) / len(d['prices']), 2)
    }

report = {
    'sync_date': today_str,
    'total_products': total_prods,
    'catalog_updated_today_count': catalog_dates.get(today_str, 0),
    'all_catalog_updated': catalog_dates.get(today_str, 0) == total_prods == 1176,
    'prev_history_count': pre_snap['history_count'],
    'current_history_count': total_history,
    'history_delta': total_history - pre_snap['history_count'],
    'prods_with_history_today': today_distinct_prods,
    'all_products_have_new_history': today_distinct_prods == total_prods == 1176,
    'price_summary': {
        'increases_count': len(increases),
        'drops_count': len(drops),
        'unchanged_count': len(unchanged),
        'avg_pct_change': round(avg_pct, 2),
        'avg_diff_inr': round(avg_diff, 2),
        'top_increases': increases[:10],
        'top_drops': drops[:10]
    },
    'category_summary': category_summary
}

with open('latest_sync_verification_report.json', 'w', encoding='utf-8') as f:
    json.dump(report, f, indent=2)

with open('post_sync_verification_report.json', 'w', encoding='utf-8') as f:
    json.dump(report, f, indent=2)

print('=== VERIFICATION RESULT ===')
print(f'Total Products: {total_prods} (Expected: 1176)')
print(f'Catalog Updated Today ({today_str}): {catalog_dates.get(today_str, 0)} (100% == {catalog_dates.get(today_str, 0) == 1176})')
print(f'Price History Records: {total_history} (Added this run: {total_history - pre_snap["history_count"]})')
print(f'Products with History for {today_str}: {today_distinct_prods} / {total_prods} (100% == {today_distinct_prods == 1176})')
print(f'Missing History Products: {missing_hist}')
print(f'Price Increases: {len(increases)}, Price Drops: {len(drops)}, Unchanged: {len(unchanged)}')
print(f'Average Price Change: {avg_pct:.2f}% (Avg INR diff: Rs.{avg_diff:.2f})')

print('\n=== CATEGORY BREAKDOWN ===')
for cat, s in sorted(category_summary.items()):
    print(f"  {cat.upper():12s}: Total={s['total']:3d} | Drops={s['drops']:3d} | Incr={s['increases']:3d} | Avg%={s['avg_pct_change']:+.2f}% | AvgDiff=Rs.{s['avg_diff_inr']:+,.2f} | Range=Rs.{s['min_price']:,.0f} - Rs.{s['max_price']:,.0f}")

print('\n=== TOP 5 PRICE DROPS (LARGEST INR REDUCTION) ===')
for idx, item in enumerate(drops[:5], 1):
    print(f"  {idx}. {item['name'][:60]} [{item['brand']} | {item['category']}]: Rs.{item['old_price']:,.0f} -> Rs.{item['new_price']:,.0f} (Diff: Rs.{item['diff']:,.0f}, {item['pct_change']:+.2f}%)")

conn.close()
