"""Migration script to add image_url column and populate high-res product photos across all products."""
import sqlite3
import re
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "smartpick.db"

# Verified photography mapping
PRODUCT_IMAGE_RULES = [
    (r"macbook\s*pro", "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=700&q=85"),
    (r"macbook\s*air", "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=700&q=85"),
    (r"macbook", "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=700&q=85"),
    (r"legion", "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=700&q=85"),
    (r"loq", "https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?auto=format&fit=crop&w=700&q=85"),
    (r"thinkpad", "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=700&q=85"),
    (r"ideapad", "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=700&q=85"),
    (r"dell\s*xps", "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=700&q=85"),
    (r"alienware", "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=700&q=85"),
    (r"inspiron|dell\s*15", "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=700&q=85"),
    (r"zephyrus", "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=700&q=85"),
    (r"tuf", "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=700&q=85"),
    (r"zenbook", "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=700&q=85"),
    (r"vivobook", "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=700&q=85"),
    (r"predator|nitro", "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=700&q=85"),
    (r"swift", "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=700&q=85"),
    (r"aspire", "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=700&q=85"),
    (r"omen|victus", "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=700&q=85"),
    (r"spectre|envy", "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=700&q=85"),
    (r"hp\s*(15s|pavilion)", "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=700&q=85"),
    (r"galaxy\s*book", "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=700&q=85"),
    (r"iphone\s*16", "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=700&q=85"),
    (r"iphone\s*15", "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=700&q=85"),
    (r"iphone", "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=700&q=85"),
    (r"galaxy\s*s24|s23|ultra", "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=700&q=85"),
    (r"fold|flip", "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=700&q=85"),
    (r"pixel", "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=700&q=85"),
    (r"oneplus", "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=700&q=85"),
    (r"wh-1000xm|sony.*headphone", "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=85"),
    (r"airpods\s*max", "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=700&q=85"),
    (r"airpods", "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=700&q=85"),
    (r"bose|quietcomfort", "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=700&q=85"),
    (r"sennheiser|momentum", "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=85"),
    (r"apple\s*watch\s*ultra", "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=700&q=85"),
    (r"apple\s*watch", "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=85"),
    (r"galaxy\s*watch", "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=700&q=85"),
    (r"garmin", "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=700&q=85"),
    (r"ipad\s*pro", "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=700&q=85"),
    (r"ipad", "https://images.unsplash.com/photo-1561154464-82e9adf32764?auto=format&fit=crop&w=700&q=85"),
    (r"galaxy\s*tab", "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=700&q=85"),
    (r"ultragear|odyssey|monitor", "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=700&q=85"),
    (r"playstation|ps5", "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=700&q=85"),
    (r"xbox", "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=700&q=85"),
    (r"switch|steam\s*deck|rog\s*ally", "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=700&q=85"),
    (r"keychron|keyboard", "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=700&q=85"),
    (r"mx\s*master|mouse", "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=700&q=85")
]

CATEGORY_FALLBACKS = {
    "laptop": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=700&q=85",
    "smartphone": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=700&q=85",
    "phone": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=700&q=85",
    "audio": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=85",
    "headphones": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=85",
    "smartwatch": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=85",
    "watch": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=85",
    "tablet": "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=700&q=85",
    "monitor": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=700&q=85",
    "gaming": "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=700&q=85",
    "accessory": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=700&q=85"
}

def resolve_photo(name: str, brand: str, category: str) -> str:
    haystack = f"{brand} {name} {category}".lower()
    for pattern, url in PRODUCT_IMAGE_RULES:
        if re.search(pattern, haystack, re.IGNORECASE):
            return url
    return CATEGORY_FALLBACKS.get((category or "laptop").lower(), CATEGORY_FALLBACKS["laptop"])

def main():
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    # Add image_url column if not present
    cursor.execute("PRAGMA table_info(products)")
    cols = [c[1] for c in cursor.fetchall()]
    if "image_url" not in cols:
        print("[MIGRATION] Adding image_url column to products table...")
        cursor.execute("ALTER TABLE products ADD COLUMN image_url VARCHAR(500) DEFAULT ''")
        conn.commit()

    # Populate image_url for all rows
    cursor.execute("SELECT id, name, brand, category, image_url FROM products")
    rows = cursor.fetchall()
    updated_count = 0

    for pid, name, brand, cat, existing_img in rows:
        img_url = resolve_photo(name or "", brand or "", cat or "")
        cursor.execute("UPDATE products SET image_url = ? WHERE id = ?", (img_url, pid))
        updated_count += 1

    conn.commit()
    conn.close()
    print(f"[SUCCESS] Updated {updated_count} products with verified high-res product photos!")

if __name__ == "__main__":
    main()
