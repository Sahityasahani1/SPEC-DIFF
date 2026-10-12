"""Extract exact, authentic Amazon CDN product image URLs for all 1,000 Amazon products.
Streams from McAuley-Lab/Amazon-Reviews-2023 raw/meta_categories/meta_Electronics.jsonl.
Matches by parent_asin or asin and extracts hi_res or large authentic product photo URL.
"""
import sys
import os
import json
import time
from pathlib import Path
import requests
from huggingface_hub import hf_hub_url

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

backend_path = Path(__file__).resolve().parent.parent
JSON_PATH = backend_path / "train" / "amazon_electronics_extracted.json"
OUTPUT_PATH = backend_path / "data" / "amazon_exact_images.json"

def main():
    if not JSON_PATH.exists():
        print(f"[ERROR] {JSON_PATH} not found!")
        return

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        saved_items = json.load(f)

    print("=" * 70)
    print("📦 EXTRACTING EXACT AMAZON CDN IMAGES FOR 1,000 ELECTRONICS ITEMS")
    print(f"   Target Items: {len(saved_items)}")
    print("=" * 70)

    # Map asin -> list of item dicts
    asin_to_items = {}
    for item in saved_items:
        asin = item.get("asin")
        if asin:
            asin_to_items.setdefault(asin, []).append(item)

    url = hf_hub_url(
        "McAuley-Lab/Amazon-Reviews-2023",
        "raw/meta_categories/meta_Electronics.jsonl",
        repo_type="dataset"
    )
    print(f"[INFO] Streaming from Hugging Face: {url}")
    
    r = requests.get(url, stream=True)
    if r.status_code != 200:
        print(f"[ERROR] HTTP {r.status_code}")
        return

    exact_images = {}
    start_time = time.time()

    for line_idx, line in enumerate(r.iter_lines()):
        if not line:
            continue
        try:
            data = json.loads(line.decode("utf-8"))
        except Exception:
            continue

        asin = data.get("parent_asin") or data.get("asin", "")
        if asin in asin_to_items and asin not in exact_images:
            images = data.get("images", [])
            chosen_url = ""
            if images:
                # Prioritize hi_res or large
                for img in images:
                    variant = img.get("variant", "")
                    hi_res = img.get("hi_res")
                    large = img.get("large")
                    if variant == "MAIN":
                        chosen_url = hi_res or large or img.get("thumb") or ""
                        break
                if not chosen_url and images:
                    chosen_url = images[0].get("hi_res") or images[0].get("large") or images[0].get("thumb") or ""
            
            if chosen_url:
                exact_images[asin] = {
                    "image_url": chosen_url,
                    "title": data.get("title", ""),
                    "images_count": len(images)
                }

            if len(exact_images) % 100 == 0:
                elapsed = time.time() - start_time
                print(f"   Extracted {len(exact_images)} / {len(asin_to_items)} exact images (line {line_idx+1:,}, {elapsed:.1f}s)...")

            if len(exact_images) >= len(asin_to_items):
                break

    elapsed = time.time() - start_time
    print(f"\n[SUCCESS] Extracted exact images for {len(exact_images)} items in {elapsed:.1f} seconds!")

    with open(OUTPUT_PATH, "w", encoding="utf-8") as out_f:
        json.dump(exact_images, out_f, indent=2, ensure_ascii=False)
    print(f"[SUCCESS] Saved exact image mapping to: {OUTPUT_PATH.name}")

if __name__ == "__main__":
    main()
