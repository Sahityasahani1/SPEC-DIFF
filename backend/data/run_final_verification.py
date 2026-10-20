import sqlite3
import json
from collections import defaultdict
from datetime import datetime

conn = sqlite3.connect('backend/smartpick.db')
c = conn.cursor()

# 1. Total products
c.execute('SELECT COUNT(*) FROM products')
total_products = c.fetchone()[0]

# 2. catalog_updated_at distribution
c.execute('SELECT catalog_updated_at, COUNT(*) FROM products GROUP BY catalog_updated_at')
catalog_dates = dict(c.fetchall())

# 3. Total history count
c.execute('SELECT COUNT(*) FROM price_history')
total_history = c.fetchone()[0]

# 4. History entries for today
c.execute("SELECT COUNT(*), COUNT(DISTINCT product_id) FROM price_history WHERE date(recorded_at) = '2026-10-18'")
today_history_total, today_distinct_products = c.fetchone()

# 5. Missing history
c.execute("""
    SELECT COUNT(*) FROM products p
    WHERE NOT EXISTS (
        SELECT 1 FROM price_history ph
        WHERE ph.product_id = p.id AND date(ph.recorded_at) = '2026-10-18'
    )
""")
missing_history_count = c.fetchone()[0]

# Load pre-run snapshot (the one saved right before this run)
with open('backend/data/pre_run_snap_20261018_evening.json', 'r', encoding='utf-8') as f:
    pre_snap = json.load(f)

# Load baseline snapshot (pre-sync from 2026-10-17 before festival sync)
with open('backend/data/pre_sync_snapshot.json', 'r', encoding='utf-8') as f:
    base_snap = json.load(f)

c.execute('SELECT id, name, brand, category, price, catalog_updated_at FROM products')
post_rows = c.fetchall()
post_products = {r[0]: {'name': r[1], 'brand': r[2], 'category': r[3], 'price': r[4], 'catalog_updated_at': r[5]} for r in post_rows}

# Compare this run's change vs pre_run
changes_vs_prerun = []
cat_stats_prerun = defaultdict(lambda: {'count': 0, 'increases': 0, 'drops': 0, 'unchanged': 0, 'pcts': [], 'diffs': []})
brand_stats_prerun = defaultdict(lambda: {'count': 0, 'pcts': [], 'diffs': []})

for pid, post in post_products.items():
    pre = pre_snap['products'][pid]
    old_p = pre['price']
    new_p = post['price']
    diff = new_p - old_p
    pct = ((new_p - old_p) / old_p) * 100 if old_p > 0 else 0.0
    cat = post['category']
    brand = post['brand']
    
    cat_stats_prerun[cat]['count'] += 1
    cat_stats_prerun[cat]['pcts'].append(pct)
    cat_stats_prerun[cat]['diffs'].append(diff)
    if new_p > old_p:
        cat_stats_prerun[cat]['increases'] += 1
    elif new_p < old_p:
        cat_stats_prerun[cat]['drops'] += 1
    else:
        cat_stats_prerun[cat]['unchanged'] += 1
        
    brand_stats_prerun[brand]['count'] += 1
    brand_stats_prerun[brand]['pcts'].append(pct)
    brand_stats_prerun[brand]['diffs'].append(diff)
    
    changes_vs_prerun.append({
        'id': pid,
        'name': post['name'],
        'brand': brand,
        'category': cat,
        'old_price': old_p,
        'new_price': new_p,
        'diff': round(diff, 2),
        'pct': round(pct, 2)
    })

# Compare vs baseline snapshot (from 2026-10-17)
changes_vs_base = []
cat_stats_base = defaultdict(lambda: {'count': 0, 'increases': 0, 'drops': 0, 'unchanged': 0, 'pcts': [], 'diffs': []})
brand_stats_base = defaultdict(lambda: {'count': 0, 'pcts': [], 'diffs': []})

for pid, post in post_products.items():
    if pid in base_snap['products']:
        old_p = base_snap['products'][pid]['price']
        new_p = post['price']
        diff = new_p - old_p
        pct = ((new_p - old_p) / old_p) * 100 if old_p > 0 else 0.0
        cat = post['category']
        brand = post['brand']
        
        cat_stats_base[cat]['count'] += 1
        cat_stats_base[cat]['pcts'].append(pct)
        cat_stats_base[cat]['diffs'].append(diff)
        if new_p > old_p:
            cat_stats_base[cat]['increases'] += 1
        elif new_p < old_p:
            cat_stats_base[cat]['drops'] += 1
        else:
            cat_stats_base[cat]['unchanged'] += 1
            
        brand_stats_base[brand]['count'] += 1
        brand_stats_base[brand]['pcts'].append(pct)
        brand_stats_base[brand]['diffs'].append(diff)
        
        changes_vs_base.append({
            'id': pid,
            'name': post['name'],
            'brand': brand,
            'category': cat,
            'old_price': old_p,
            'new_price': new_p,
            'diff': round(diff, 2),
            'pct': round(pct, 2)
        })

# Sort top drops and increases
changes_vs_prerun.sort(key=lambda x: x['diff'])
top_drops_prerun = changes_vs_prerun[:10]
changes_vs_prerun.sort(key=lambda x: x['diff'], reverse=True)
top_increases_prerun = changes_vs_prerun[:10]

changes_vs_base.sort(key=lambda x: x['diff'])
top_drops_base = changes_vs_base[:10]
changes_vs_base.sort(key=lambda x: x['diff'], reverse=True)
top_increases_base = changes_vs_base[:10]

# Compute summary
all_pcts_prerun = [c['pct'] for c in changes_vs_prerun]
avg_pct_prerun = sum(all_pcts_prerun) / len(all_pcts_prerun) if all_pcts_prerun else 0.0

all_pcts_base = [c['pct'] for c in changes_vs_base]
avg_pct_base = sum(all_pcts_base) / len(all_pcts_base) if all_pcts_base else 0.0

cat_summary_prerun = {}
for cat, d in cat_stats_prerun.items():
    cat_summary_prerun[cat] = {
        'count': d['count'],
        'increases': d['increases'],
        'drops': d['drops'],
        'unchanged': d['unchanged'],
        'avg_pct': round(sum(d['pcts']) / len(d['pcts']), 2) if d['pcts'] else 0.0,
        'avg_diff': round(sum(d['diffs']) / len(d['diffs']), 2) if d['diffs'] else 0.0
    }

cat_summary_base = {}
for cat, d in cat_stats_base.items():
    cat_summary_base[cat] = {
        'count': d['count'],
        'increases': d['increases'],
        'drops': d['drops'],
        'unchanged': d['unchanged'],
        'avg_pct': round(sum(d['pcts']) / len(d['pcts']), 2) if d['pcts'] else 0.0,
        'avg_diff': round(sum(d['diffs']) / len(d['diffs']), 2) if d['diffs'] else 0.0
    }

major_brands = ['Apple', 'Dell', 'HP', 'Lenovo', 'ASUS', 'Acer', 'Samsung', 'MSI', 'Xiaomi']
brand_summary_base = {}
for b in major_brands:
    if b in brand_stats_base:
        d = brand_stats_base[b]
        brand_summary_base[b] = {
            'count': d['count'],
            'avg_pct': round(sum(d['pcts']) / len(d['pcts']), 2) if d['pcts'] else 0.0,
            'avg_diff': round(sum(d['diffs']) / len(d['diffs']), 2) if d['diffs'] else 0.0
        }

final_report = {
    'sync_timestamp': datetime.now().isoformat(),
    'verification_status': {
        'total_products': total_products,
        'expected_products': 1176,
        'catalog_updated_at_distribution': catalog_dates,
        'all_catalog_updated_to_today': catalog_dates.get('2026-10-18', 0) == total_products == 1176,
        'total_price_history_records': total_history,
        'today_history_records': today_history_total,
        'today_distinct_products_with_history': today_distinct_products,
        'all_products_have_today_history': today_distinct_products == total_products == 1176,
        'products_missing_today_history': missing_history_count,
        'history_records_added_in_this_run': total_history - pre_snap['total_history']
    },
    'this_run_metrics': {
        'avg_pct_change': round(avg_pct_prerun, 2),
        'category_summary': cat_summary_prerun,
        'top_drops': top_drops_prerun,
        'top_increases': top_increases_prerun
    },
    'daily_baseline_metrics_vs_pre_sync': {
        'avg_pct_change': round(avg_pct_base, 2),
        'category_summary': cat_summary_base,
        'brand_summary': brand_summary_base,
        'top_drops': top_drops_base,
        'top_increases': top_increases_base
    }
}

with open('backend/data/sync_verification_report_final.json', 'w', encoding='utf-8') as f:
    json.dump(final_report, f, indent=2)

print('SUCCESS: Report written to backend/data/sync_verification_report_final.json')
print(f'Total Products: {total_products}')
print(f'Catalog updated dates: {catalog_dates}')
print(f'Price history total: {total_history}')
print(f'Distinct products with history today: {today_distinct_products}')
print(f'Missing history count: {missing_history_count}')
print(f'New history added this run: {total_history - pre_snap["total_history"]}')
conn.close()
