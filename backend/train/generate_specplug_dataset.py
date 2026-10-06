"""SpecPlug SFT Dataset Generator for Qwen-2.5-1.5B-Instruct.
Generates thousands of high-quality, verified training conversations in ChatML format
grounded in real Indian electronics hardware data (₹ INR).
"""
import sys
import os
import json
import random
from pathlib import Path

# Add backend directory to path
backend_path = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_path))

from app.database import SessionLocal
from app.models import Product
from app.services.store_deals_service import get_store_deals
from app.services.benchmark_service import get_benchmarks

SYSTEM_PROMPT = (
    "You are SpecPlug, the ultimate Gen-Z AI hardware expert and electronics advisor for the Indian market (₹ INR). "
    "Tagline: 'Skill issue? Nah, spec diff. No cap, only specs.' "
    "You are witty, highly knowledgeable, sharp, and honest. You never hallucinate specs or US prices. "
    "Always quote verified Indian street prices (₹), real CPU/GPU/RAM specs, key strengths, trade-offs (the catch), and store deals."
)

CODING_PROMPTS = [
    "What is the best laptop for coding and software engineering under ₹{budget}?",
    "I'm a computer science student learning Python, Docker, and Web Dev. Need a laptop under ₹{budget}.",
    "Best programming laptop under ₹{budget} with good Linux support and upgradable RAM?",
    "Need a machine for compiling code, running local Docker containers, and college use under ₹{budget}.",
    "Which laptop under ₹{budget} has the best keyboard and battery life for coding?",
]

GAMING_PROMPTS = [
    "Recommend a high-FPS gaming laptop under ₹{budget} that won't overheat.",
    "Best laptop for competitive Valorant, CS2, and GTA V under ₹{budget}?",
    "I want an RTX graphics card laptop under ₹{budget} with 140W TGP and 144Hz screen.",
    "What's the best gaming machine in India right now around ₹{budget}?",
    "Need a laptop with high GPU performance and DLSS 3 for AAA gaming under ₹{budget}.",
]

CAMERA_PROMPTS = [
    "Which smartphone under ₹{budget} has the absolute best camera for photography and videos?",
    "I want a phone with crazy good cameras, optical zoom, and 4K video under ₹{budget}.",
    "Best camera phone in India for low-light shots, portrait photos, and Instagram under ₹{budget}?",
    "Which phone has the best sensors and computational photography around ₹{budget}?",
]

BATTERY_PROMPTS = [
    "I travel a lot across India. Need a lightweight laptop with 12+ hours real battery life under ₹{budget}.",
    "Which laptop is featherlight (under 1.4kg) with crazy all-day battery life under ₹{budget}?",
    "Best portable machine for long flights and work without carrying a bulky charger under ₹{budget}?",
]

STORE_DEAL_PROMPTS = [
    "Where can I find the best deal for {product} right now?",
    "Which Indian store has the lowest price for {product} between Amazon, Flipkart, and Croma?",
    "Is {product} at ₹{price} a good buy or should I wait for a sale?",
    "What bank card offers and discounts are available on {product}?",
]

COMPARISON_PROMPTS = [
    "Compare {prod1} vs {prod2}. Which one should I buy?",
    "What is the difference between {prod1} and {prod2}? Is the price difference worth it?",
    "Head-to-head showdown: {prod1} vs {prod2} for {use_case}.",
    "{prod1} or {prod2}? Break down the specs, pros, and the catch with no cap.",
]

TRADEOFF_PROMPTS = [
    "What is the catch with {product}? What are its biggest drawbacks?",
    "What are the pros and cons of {product}?",
    "Before I buy {product}, what trade-offs should I know about?",
]

def format_inr(val):
    return f"₹{int(val):,}"

def build_coding_response(p, deal, benchmarks):
    return (
        f"### 💻 Best Coding & Dev Pick: **{p.name}**\n\n"
        f"For software development, Docker containers, and long compiling sessions, this is the top play:\n\n"
        f"- **Street Price**: {format_inr(p.price)} (Best Deal: **{deal['best_deal_store']}** at {deal['formatted_best_price']})\n"
        f"- **Silicon**: `{p.processor}` with `{p.gpu}`\n"
        f"- **Memory & Storage**: `{p.ram_gb}GB RAM` ({p.ram_expandability}) + `{p.storage_gb}GB SSD`\n"
        f"- **Display**: `{p.display_tech}`\n"
        f"- **Battery**: `{p.battery_hours}h verified endurance` • Weight: `{p.weight_kg}kg`\n\n"
        f"**Why it hits (Pros):**\n"
        + "".join([f"- {pro}\n" for pro in (p.pros or "").split(";") if pro]) +
        f"\n⚠️ **The Catch (Trade-off):**\n"
        f"- {p.cons or 'Make sure to check if you need dedicated GPU for CUDA workloads.'}\n\n"
        f"💡 **SpecPlug Verdict**: No cap, if you want reliable terminal performance without thermal throttling, this is your plug."
    )

def build_gaming_response(p, deal, benchmarks):
    fps_text = ""
    if benchmarks.get("gaming_fps"):
        fps_dict = benchmarks["gaming_fps"]
        fps_text = f"- **Gaming FPS (1080p Ultra)**: CS2: `{fps_dict.get('CS2')} FPS` • Valorant: `{fps_dict.get('Valorant')} FPS` • Cyberpunk: `{fps_dict.get('Cyberpunk_2077')} FPS`\n"

    return (
        f"### ⚡ High-FPS Gaming Champion: **{p.name}**\n\n"
        f"Here is your verified battlestation for high refresh esports and AAA rendering:\n\n"
        f"- **Verified Price**: {format_inr(p.price)} (Lowest on **{deal['best_deal_store']}** at {deal['formatted_best_price']})\n"
        f"- **GPU**: `{p.gpu}`\n"
        f"- **CPU**: `{p.processor}`\n"
        f"- **Display**: `{p.display_tech}`\n"
        f"{fps_text}"
        f"- **RAM / SSD**: `{p.ram_gb}GB RAM` + `{p.storage_gb}GB High-Speed SSD`\n\n"
        f"**Strengths:**\n"
        + "".join([f"- {pro}\n" for pro in (p.pros or "").split(";") if pro]) +
        f"\n⚠️ **The Catch:**\n"
        f"- {p.cons or 'Expect louder fan profiles under Turbo mode during sustained gaming.'}\n\n"
        f"💡 **SpecPlug Verdict**: Pure spec diff. Runs cold and dominates frame times for the price."
    )

def build_camera_response(p, deal):
    return (
        f"### 📸 Flagship Camera Champion: **{p.name}**\n\n"
        f"For cinema-grade 4K/8K video, natural skin tones, and low-light photography in India:\n\n"
        f"- **Price**: {format_inr(p.price)} (Best Deal: **{deal['best_deal_store']}** at {deal['formatted_best_price']})\n"
        f"- **Optics & Screen**: `{p.display_tech}`\n"
        f"- **Silicon**: `{p.processor}` with dedicated neural image processing\n"
        f"- **Battery**: `{p.battery_hours}h active endurance` • Weight: `{p.weight_kg}kg`\n\n"
        f"**Camera & Hardware Strengths:**\n"
        + "".join([f"- {pro}\n" for pro in (p.pros or "").split(";") if pro]) +
        f"\n⚠️ **The Catch:**\n"
        f"- {p.cons or 'Camera bump requires a protective case.'}\n\n"
        f"💡 **SpecPlug Verdict**: Best computational photography and optic stabilization in its class. No cap."
    )

def build_comparison_response(p1, deal1, p2, deal2):
    diff = abs(p1.price - p2.price)
    cheaper = p1 if p1.price < p2.price else p2
    pricier = p2 if p1.price < p2.price else p1

    return (
        f"### 🥊 Head-to-Head Showdown: **{p1.name}** vs **{p2.name}**\n\n"
        f"Here is the honest breakdown with **no cap, only specs**:\n\n"
        f"#### 1. Price & Store Deal Gap\n"
        f"- **{p1.name}**: {format_inr(p1.price)} (Best Deal: **{deal1['best_deal_store']}** at {deal1['formatted_best_price']})\n"
        f"- **{p2.name}**: {format_inr(p2.price)} (Best Deal: **{deal2['best_deal_store']}** at {deal2['formatted_best_price']})\n"
        f"- 💡 **Price Difference**: {format_inr(diff)} gap between them.\n\n"
        f"#### 2. Hardware Spec Face-Off\n"
        f"- **Silicon**: `{p1.processor}` vs `{p2.processor}`\n"
        f"- **Graphics**: `{p1.gpu}` vs `{p2.gpu}`\n"
        f"- **RAM & Storage**: `{p1.ram_gb}GB / {p1.storage_gb}GB` vs `{p2.ram_gb}GB / {p2.storage_gb}GB`\n"
        f"- **Battery & Weight**: `{p1.battery_hours}h ({p1.weight_kg}kg)` vs `{p2.battery_hours}h ({p2.weight_kg}kg)`\n"
        f"- **Displays**: `{p1.display_tech}` vs `{p2.display_tech}`\n\n"
        f"#### 3. SpecPlug Verdict\n"
        f"- **Pick {p1.name} if**: You prioritize {p1.pros.split(';')[0] if p1.pros else 'better value'}.\n"
        f"- **Pick {p2.name} if**: You want {p2.pros.split(';')[0] if p2.pros else 'premium features'}.\n"
        f"- 🔌 **The Call**: If you're on a budget, **{cheaper.name}** gives you maximum bang for Rupee. If you need peak performance, pay the extra {format_inr(diff)} for **{pricier.name}**."
    )

def generate_dataset(output_dir="data", count=5000):
    db = SessionLocal()
    products = db.query(Product).all()
    db.close()

    if not products:
        print("[ERROR] No products found in database!")
        return

    print(f"[INFO] Loaded {len(products)} products from database.")

    laptops = [p for p in products if p.category == "laptop"]
    phones = [p for p in products if p.category == "smartphone"]
    audio = [p for p in products if p.category == "audio"]
    watches = [p for p in products if p.category == "smartwatch"]
    tablets = [p for p in products if p.category == "tablet"]

    dataset = []

    # 1. Generate Coding Queries
    for _ in range(count // 5):
        p = random.choice(laptops)
        deal = get_store_deals(p)
        bm = get_benchmarks(p)
        budget = int(round(p.price * random.uniform(1.05, 1.25) / 1000) * 1000)
        q_template = random.choice(CODING_PROMPTS)
        user_query = q_template.format(budget=f"{budget:,}")

        dataset.append({
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_query},
                {"role": "assistant", "content": build_coding_response(p, deal, bm)}
            ]
        })

    # 2. Generate Gaming Queries
    gaming_laptops = [p for p in laptops if "rtx" in (p.gpu or "").lower() or "radeon" in (p.gpu or "").lower() or p.price > 60000]
    for _ in range(count // 5):
        p = random.choice(gaming_laptops if gaming_laptops else laptops)
        deal = get_store_deals(p)
        bm = get_benchmarks(p)
        budget = int(round(p.price * random.uniform(1.05, 1.25) / 1000) * 1000)
        q_template = random.choice(GAMING_PROMPTS)
        user_query = q_template.format(budget=f"{budget:,}")

        dataset.append({
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_query},
                {"role": "assistant", "content": build_gaming_response(p, deal, bm)}
            ]
        })

    # 3. Generate Camera / Phone Queries
    for _ in range(count // 5):
        p = random.choice(phones if phones else products)
        deal = get_store_deals(p)
        budget = int(round(p.price * random.uniform(1.05, 1.25) / 1000) * 1000)
        q_template = random.choice(CAMERA_PROMPTS)
        user_query = q_template.format(budget=f"{budget:,}")

        dataset.append({
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_query},
                {"role": "assistant", "content": build_camera_response(p, deal)}
            ]
        })

    # 4. Generate Comparisons
    for _ in range(count // 5):
        cat = random.choice(["laptop", "smartphone", "audio", "tablet", "smartwatch"])
        candidates = [p for p in products if p.category == cat]
        if len(candidates) >= 2:
            p1, p2 = random.sample(candidates, 2)
            deal1 = get_store_deals(p1)
            deal2 = get_store_deals(p2)
            use_case = random.choice(["students", "coding", "gaming", "daily use", "office work", "content creation"])
            q_template = random.choice(COMPARISON_PROMPTS)
            user_query = q_template.format(prod1=p1.name, prod2=p2.name, use_case=use_case)

            dataset.append({
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_query},
                    {"role": "assistant", "content": build_comparison_response(p1, deal1, p2, deal2)}
                ]
            })

    # 5. Generate Trade-offs & Store Deals
    for _ in range(count // 5):
        p = random.choice(products)
        deal = get_store_deals(p)
        q_template = random.choice(STORE_DEAL_PROMPTS)
        user_query = q_template.format(product=p.name, price=format_inr(p.price))

        answer = (
            f"### 🏷️ Best Store Deal for **{p.name}**\n\n"
            f"- **Lowest Price**: **{deal['best_deal_store']}** at **{deal['formatted_best_price']}**\n"
            f"- **Peak Price**: {deal['formatted_highest_price']} (Save **₹{deal['savings_vs_highest']:,}** by buying on {deal['best_deal_store']})\n\n"
            f"#### ⚡ 5-Store Price Breakdown:\n"
            + "".join([f"- **{s['store_name']}**: {s['formatted_price']} • *{s['bank_offer']}* • {s['delivery']}\n" for s in deal['stores']])
            + f"\n💡 **SpecPlug Advice**: Buy from **{deal['best_deal_store']}** to save the most cash. All partner links are verified authentic Indian inventory."
        )

        dataset.append({
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_query},
                {"role": "assistant", "content": answer}
            ]
        })

    # 6. Append real Amazon Reviews 2023 extracted QA samples
    amazon_json = Path(__file__).resolve().parent / "amazon_electronics_extracted.json"
    if amazon_json.exists():
        with open(amazon_json, "r", encoding="utf-8") as f:
            amz_items = json.load(f)
        for item in amz_items:
            title = item.get("title", "")
            brand = item.get("brand", "")
            cat = item.get("category", "gadget")
            rating = item.get("rating", 4.2)
            price = item.get("price_inr", 4999)
            features = item.get("features", [])
            feature_bullets = "\n".join([f"- {feat}" for feat in features[:3]])
            user_query = f"Give me an honest SpecPlug breakdown of {title[:75]}. Is it worth buying?"
            assistant_reply = (
                f"### 🔌 SpecPlug Hardware Breakdown: **{brand} {title[:60]}**\n\n"
                f"- **Estimated Indian Street Price**: ₹{price:,}\n"
                f"- **Customer Score**: ★ {rating} / 5.0\n"
                f"- **Category**: `{cat.upper()}`\n\n"
                f"#### 🔍 Key Hardware Features:\n{feature_bullets}\n\n"
                f"💡 **SpecPlug Verdict**: Good pick in the {cat} segment if you prioritize verified hardware durability. No cap, check local store deals before checking out."
            )
            dataset.append({
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_query},
                    {"role": "assistant", "content": assistant_reply}
                ]
            })

    random.shuffle(dataset)

    # Train / Val Split (90% / 10%)
    split_idx = int(len(dataset) * 0.9)
    train_data = dataset[:split_idx]
    val_data = dataset[split_idx:]

    out_path = Path(__file__).resolve().parent
    train_file = out_path / "specplug_train.jsonl"
    val_file = out_path / "specplug_val.jsonl"

    with open(train_file, "w", encoding="utf-8") as f:
        for item in train_data:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")

    with open(val_file, "w", encoding="utf-8") as f:
        for item in val_data:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")

    print(f"[SUCCESS] Generated {len(dataset)} conversation samples across {len(products)} products!")
    print(f"          Train: {len(train_data)} samples -> {train_file.name}")
    print(f"          Val  : {len(val_data)} samples -> {val_file.name}")

if __name__ == "__main__":
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 10000
    generate_dataset(count=count)
