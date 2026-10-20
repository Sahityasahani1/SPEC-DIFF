import sqlite3
import json
import datetime
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

conn = sqlite3.connect('backend/smartpick.db')
c = conn.cursor()

# 1. Product Counts and Dates
c.execute('SELECT COUNT(*) FROM products')
total_products = c.fetchone()[0]

c.execute('SELECT catalog_updated_at, COUNT(*) FROM products GROUP BY catalog_updated_at')
catalog_dates = dict(c.fetchall())

# 2. Price History Counts
c.execute('SELECT COUNT(*) FROM price_history')
total_history = c.fetchone()[0]

today_str = datetime.date.today().isoformat()

c.execute("SELECT COUNT(DISTINCT product_id) FROM price_history WHERE date(recorded_at) = ?", (today_str,))
prods_with_history_today = c.fetchone()[0]

c.execute("SELECT COUNT(*) FROM price_history WHERE date(recorded_at) = ?", (today_str,))
history_records_today = c.fetchone()[0]

# 3. Load pre-run snapshot
with open('pre_run_snapshot.json', 'r', encoding='utf-8') as f:
    pre_snap = json.load(f)

# 4. Fetch current product details
c.execute('SELECT id, name, brand, category, price, catalog_updated_at FROM products')
post_rows = c.fetchall()
post_products = {r[0]: {'name': r[1], 'brand': r[2], 'category': r[3], 'price': r[4], 'catalog_updated_at': r[5]} for r in post_rows}

increases = []
drops = []
unchanged = []
category_stats = {}

for pid, pre in pre_snap['products'].items():
    post = post_products[pid]
    old_p = pre['price']
    new_p = post['price']
    cat = pre['category']
    
    if cat not in category_stats:
        category_stats[cat] = {
            'total': 0,
            'increases': 0,
            'drops': 0,
            'unchanged': 0,
            'pct_changes': [],
            'diffs': [],
            'old_prices': [],
            'new_prices': []
        }
    category_stats[cat]['total'] += 1
    category_stats[cat]['old_prices'].append(old_p)
    category_stats[cat]['new_prices'].append(new_p)

    diff = new_p - old_p
    pct = ((new_p - old_p) / old_p) * 100 if old_p > 0 else 0.0
    category_stats[cat]['pct_changes'].append(pct)
    category_stats[cat]['diffs'].append(diff)

    record = {
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
        increases.append(record)
        category_stats[cat]['increases'] += 1
    elif new_p < old_p:
        drops.append(record)
        category_stats[cat]['drops'] += 1
    else:
        unchanged.append(record)
        category_stats[cat]['unchanged'] += 1

increases.sort(key=lambda x: x['pct_change'], reverse=True)
drops.sort(key=lambda x: x['pct_change'])

all_pcts = [item['pct_change'] for item in increases + drops + unchanged]
all_diffs = [item['diff'] for item in increases + drops + unchanged]
avg_pct = sum(all_pcts) / len(all_pcts) if all_pcts else 0.0
avg_diff = sum(all_diffs) / len(all_diffs) if all_diffs else 0.0

verification_result = {
    'sync_date': today_str,
    'total_products': total_products,
    'catalog_updated_today_count': catalog_dates.get(today_str, 0),
    'all_catalog_updated': catalog_dates.get(today_str, 0) == total_products,
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
        'avg_diff_inr': round(avg_diff, 2),
        'top_increases': increases[:10],
        'top_drops': drops[:10]
    },
    'category_summary': {
        cat: {
            'total': s['total'],
            'increases': s['increases'],
            'drops': s['drops'],
            'unchanged': s['unchanged'],
            'avg_pct_change': round(sum(s['pct_changes']) / len(s['pct_changes']), 2) if s['pct_changes'] else 0.0,
            'avg_diff_inr': round(sum(s['diffs']) / len(s['diffs']), 2) if s['diffs'] else 0.0,
            'min_price': min(s['new_prices']),
            'max_price': max(s['new_prices']),
            'avg_price': round(sum(s['new_prices']) / len(s['new_prices']), 2)
        } for cat, s in sorted(category_stats.items())
    }
}

with open('post_sync_verification_report.json', 'w', encoding='utf-8') as f:
    json.dump(verification_result, f, indent=2)

print(json.dumps(verification_result, indent=2))
