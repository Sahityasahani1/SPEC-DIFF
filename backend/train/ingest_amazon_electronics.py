"""Amazon Reviews 2023 Electronics Stream Ingestion & Dataset Enricher.
Streams real hardware metadata from McAuley-Lab/Amazon-Reviews-2023 on Hugging Face,
cleans and normalizes technical specifications, converts USD to INR parity,
and enriches the SpecPlug Qwen-2.5-1.5B fine-tuning dataset with real customer QA and specs.
"""
import sys
import os
import json
import re
from pathlib import Path
import requests
from huggingface_hub import hf_hub_url

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

USD_TO_INR_RATE = 84.0  # Current conversion rate with Indian import duties parity

CATEGORIES_FILTER = {
    "laptop": ["laptop", "notebook", "macbook", "chromebook", "ultrabook", "thinkpad", "ideapad", "vivobook", "zenbook"],
    "smartphone": ["smartphone", "iphone", "galaxy s", "galaxy z", "pixel", "oneplus", "motorola phone"],
    "tablet": ["ipad", "tablet", "galaxy tab", "drawing tablet"],
    "audio": ["headphone", "earbud", "earphone", "soundbar", "bluetooth speaker", "noise cancelling"],
    "monitor": ["gaming monitor", "4k monitor", "oled monitor", "curved monitor", "ultrawide monitor"],
    "smartwatch": ["smartwatch", "apple watch", "galaxy watch", "fitness tracker", "garmin watch"],
    "accessory": ["mechanical keyboard", "wireless mouse", "portable ssd", "external hard drive", "gan charger", "thunderbolt dock"]
}

EXCLUDE_KEYWORDS = [
    "case", "skin", "sleeve", "sticker", "cover", "decal", "stand", "cable",
    "protector", "strap", "adapter ring", "cleaning cloth", "replacement tips"
]

def clean_price(price_raw):
    if not price_raw:
        return None
    try:
        val = float(str(price_raw).replace("$", "").replace(",", "").strip())
        if val > 5:
            return round(val * USD_TO_INR_RATE / 100) * 100 - 10
    except Exception:
        pass
    return None

def detect_category(title):
    t = title.lower()
    for cat, kws in CATEGORIES_FILTER.items():
        if any(kw in t for kw in kws) and not any(ex in t for ex in EXCLUDE_KEYWORDS):
            return cat
    return None

def extract_brand(item):
    details = item.get("details", {})
    if isinstance(details, dict) and "Brand" in details:
        return details["Brand"].strip()
    # Extract from title
    first_word = item.get("title", "").split()[0] if item.get("title") else "Unknown"
    return first_word

def ingest_amazon_electronics(max_items=1000, output_dataset_path=None):
    url = hf_hub_url(
        "McAuley-Lab/Amazon-Reviews-2023",
        "raw/meta_categories/meta_Electronics.jsonl",
        repo_type="dataset"
    )

    print("=" * 70)
    print("🌐 STREAMING FROM MC AULEY LAB AMAZON REVIEWS 2023 (ELECTRONICS)")
    print(f"   URL: {url}")
    print(f"   Target Clean Hardware Items: {max_items}")
    print("=" * 70)

    response = requests.get(url, stream=True)
    if response.status_code != 200:
        print(f"[ERROR] Failed to stream from Hugging Face: HTTP {response.status_code}")
        return []

    collected_products = []
    qa_training_samples = []

    system_prompt = (
        "You are SpecPlug, the ultimate Gen-Z AI hardware expert and electronics advisor for the Indian market (₹ INR). "
        "Tagline: 'Skill issue? Nah, spec diff. No cap, only specs.' "
        "Provide direct, deeply technical advice with zero marketing fluff. Never hallucinate specs."
    )

    print("\n[INFO] Filtering genuine computing and gadget hardware...")

    for line_idx, line in enumerate(response.iter_lines()):
        if not line:
            continue
        try:
            item = json.loads(line.decode("utf-8"))
        except Exception:
            continue

        title = item.get("title", "").strip()
        if not title or len(title) < 15:
            continue

        cat = detect_category(title)
        if not cat:
            continue

        price_inr = clean_price(item.get("price"))
        features = item.get("features", [])
        if not features or len(features) < 2:
            continue

        brand = extract_brand(item)
        rating = item.get("average_rating", 4.3)
        if rating is None or rating < 3.5:
            continue

        product_entry = {
            "title": title,
            "category": cat,
            "brand": brand,
            "price_inr": price_inr or 4999,
            "rating": rating,
            "features": features[:4],
            "description": (item.get("description") or [""])[0][:300],
            "asin": item.get("parent_asin") or item.get("asin", "")
        }

        collected_products.append(product_entry)

        # Generate SFT instruction sample for Qwen-2.5-1.5B
        feature_bullets = "\n".join([f"- {f}" for f in features[:3]])
        user_query = f"Give me an honest SpecPlug breakdown of {title[:75]}. Is it worth buying?"
        assistant_reply = (
            f"### 🔌 SpecPlug Hardware Breakdown: **{brand} {title[:60]}**\n\n"
            f"- **Estimated Indian Street Price**: ₹{product_entry['price_inr']:,}\n"
            f"- **Customer Score**: ★ {rating} / 5.0\n"
            f"- **Category**: `{cat.upper()}`\n\n"
            f"#### 🔍 Key Hardware Features:\n{feature_bullets}\n\n"
            f"💡 **SpecPlug Verdict**: Good pick in the {cat} segment if you prioritize verified hardware durability. No cap, check local store deals before checking out."
        )

        qa_training_samples.append({
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_query},
                {"role": "assistant", "content": assistant_reply}
            ]
        })

        if len(collected_products) % 100 == 0:
            print(f"   Collected {len(collected_products)}/{max_items} hardware items (scanned {line_idx+1:,} raw rows)...")

        if len(collected_products) >= max_items:
            break

    print(f"\n[SUCCESS] Extracted {len(collected_products)} clean hardware items from Amazon Reviews 2023!")

    # Save to JSON
    current_dir = Path(__file__).resolve().parent
    out_json = current_dir / "amazon_electronics_extracted.json"
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(collected_products, f, indent=2, ensure_ascii=False)
    print(f"[SUCCESS] Saved extracted catalog to {out_json.name}")

    # Append to training set
    if output_dataset_path:
        train_file = Path(output_dataset_path)
    else:
        train_file = current_dir / "specplug_train.jsonl"

    existing_lines = 0
    if train_file.exists():
        with open(train_file, "r", encoding="utf-8") as f:
            existing_lines = sum(1 for _ in f)

    with open(train_file, "a", encoding="utf-8") as f:
        for s in qa_training_samples:
            f.write(json.dumps(s, ensure_ascii=False) + "\n")

    total_samples = existing_lines + len(qa_training_samples)
    print(f"[SUCCESS] Enriched {train_file.name}: Added {len(qa_training_samples)} Amazon QA samples.")
    print(f"          Total training dataset size now: {total_samples} conversation samples!")

    return collected_products

if __name__ == "__main__":
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 1000
    ingest_amazon_electronics(max_items=count)
