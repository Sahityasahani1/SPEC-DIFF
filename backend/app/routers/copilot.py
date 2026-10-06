"""SpecPlug AI Hardware Advisor Router (POST /api/copilot).
Provides intelligent, deeply grounded hardware advice for the Indian electronics market.
Persona: SpecPlug 🔌 ("Skill issue? Nah, spec diff. No cap, only specs.")
"""
import os
import re
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Product
from app.schemas import CopilotRequest, CopilotResponse
from app.services.benchmark_service import get_benchmarks
from app.services.price_tracker_service import get_price_signal
from app.services.store_deals_service import get_store_deals
from app.services.vector_service import semantic_engine

try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    genai = None
    HAS_GENAI = False

router = APIRouter(prefix="/api", tags=["SpecPlug AI"])

CATEGORY_KEYWORDS = {
    "laptop": ["laptop", "notebook", "macbook", "thinkpad", "vivobook", "zenbook", "legion", "loq", "tuf", "predator", "swift", "pavilion", "spectre", "envy", "xps", "coding laptop"],
    "smartphone": ["phone", "smartphone", "iphone", "galaxy", "pixel", "oneplus", "nothing", "redmi", "realme", "vivo", "camera phone", "foldable", "flip"],
    "audio": ["headphone", "headphones", "earbud", "earbuds", "tws", "audio", "sound", "anc", "noise cancelling", "speaker", "soundbar", "sony xm5", "airpods"],
    "smartwatch": ["watch", "smartwatch", "fitness", "band", "wearable", "apple watch", "galaxy watch", "garmin", "tracker"],
    "tablet": ["tablet", "ipad", "tab", "stylus", "drawing tablet", "kindle", "surface"],
    "monitor": ["monitor", "display", "screen", "oled monitor", "gaming monitor", "4k monitor", "ultrawide", "refresh rate"],
    "gaming": ["console", "ps5", "playstation", "xbox", "nintendo", "switch", "rog ally", "steam deck", "handheld"],
    "accessory": ["keyboard", "mouse", "charger", "power bank", "ssd", "dock", "keychron", "mx master"]
}

BRAND_KEYWORDS = [
    "apple", "samsung", "lenovo", "asus", "dell", "hp", "acer", "sony",
    "oneplus", "google", "nothing", "xiaomi", "realme", "motorola", "vivo",
    "bose", "sennheiser", "logitech", "keychron", "garmin", "microsoft"
]

def _parse_query_intent(query: str) -> Dict[str, Any]:
    q = query.lower()
    intent = {
        "category": None,
        "brand": None,
        "max_budget": None,
        "theme": "general",
        "is_comparison": False,
        "product_names": []
    }

    # Extract Category
    for cat, kws in CATEGORY_KEYWORDS.items():
        if any(kw in q for kw in kws):
            intent["category"] = cat
            break

    # Extract Brand
    for b in BRAND_KEYWORDS:
        if b in q:
            intent["brand"] = b
            break

    # Extract Budget (e.g. "under 80000", "under 80k", "under 1.5 lakh", "under 50k")
    budget_match = re.search(r"under\s*(?:rs\.?|₹)?\s*(\d+(?:\.\d+)?)\s*(k|lakh|lac)?", q)
    if budget_match:
        val = float(budget_match.group(1))
        unit = budget_match.group(2)
        if unit == "k":
            intent["max_budget"] = val * 1000
        elif unit in ["lakh", "lac"]:
            intent["max_budget"] = val * 100000
        elif val < 500:  # e.g. "under 80" -> 80k
            intent["max_budget"] = val * 1000
        else:
            intent["max_budget"] = val

    # Detect Theme
    if any(k in q for k in ["vs", "versus", "compare", "difference between", "better than"]):
        intent["is_comparison"] = True
    elif any(k in q for k in ["code", "coding", "programming", "developer", "python", "docker", "linux", "b.tech", "cs"]):
        intent["theme"] = "coding"
    elif any(k in q for k in ["game", "gaming", "fps", "valorant", "cs2", "gta", "cyberpunk", "gpu", "graphics", "rtx"]):
        intent["theme"] = "gaming"
    elif any(k in q for k in ["camera", "photo", "photography", "video", "editing", "creator", "youtube"]):
        intent["theme"] = "camera"
    elif any(k in q for k in ["battery", "travel", "flight", "battery life", "endurance", "light", "portable", "weight"]):
        intent["theme"] = "battery_travel"
    elif any(k in q for k in ["cheap", "budget", "affordable", "value", "deal", "discount", "price"]):
        intent["theme"] = "budget_value"
    elif any(k in q for k in ["pros and cons", "tradeoff", "catch", "drawback", "limitation"]):
        intent["theme"] = "tradeoffs"

    return intent

def _select_relevant_products(query: str, all_prods: List[Product], active_ids: List[str], intent: Dict[str, Any]) -> List[Product]:
    if not all_prods:
        return []

    # Semantic similarity scores
    semantic_scores = semantic_engine.compute_similarity(query, all_prods)

    scored = []
    q_words = set(re.findall(r"\w+", query.lower()))

    for p in all_prods:
        score = semantic_scores.get(p.id, 0.0)
        p_name_lower = p.name.lower()
        p_brand_lower = p.brand.lower()
        p_cat_lower = p.category.lower()

        # Direct name match bonus
        name_words = set(re.findall(r"\w+", p_name_lower))
        overlap = len(q_words.intersection(name_words))
        if overlap > 0:
            score += overlap * 0.15

        # Active product boost
        if active_ids and p.id in active_ids:
            score += 0.35

        # Category match
        if intent["category"] and p_cat_lower == intent["category"]:
            score += 0.25

        # Brand match
        if intent["brand"] and intent["brand"] in p_brand_lower:
            score += 0.20

        # Budget match / penalty
        if intent["max_budget"]:
            if p.price <= intent["max_budget"]:
                score += 0.15
            else:
                score -= 0.40  # Heavy penalty for exceeding budget

        scored.append((p, score))

    scored.sort(key=lambda x: x[1], reverse=True)
    top_candidates = [p for p, s in scored[:5]]

    # Ensure active products are included
    if active_ids:
        active_objs = [p for p in all_prods if p.id in active_ids]
        for a in active_objs:
            if a not in top_candidates:
                top_candidates.insert(0, a)

    return top_candidates[:5]

def _format_inr(num: float) -> str:
    return f"₹{int(num):,}"

def _generate_specplug_standalone_advice(query: str, products: List[Product], intent: Dict[str, Any]) -> tuple[str, List[str]]:
    """Synthesizes rich, deeply technical, and honest Gen-Z hardware advice without requiring external LLM APIs."""
    if not products:
        return (
            "Yo! Couldn't find hardware in our catalog matching that exact spec combo. "
            "Try adjusting your budget or searching by device type (e.g., 'coding laptop under ₹70k' or 'best ANC headphones')! 🔌",
            ["Best laptop for coding under ₹80k", "Top flagship smartphones in India", "Best gaming laptop with RTX 4060"]
        )

    p1 = products[0]
    p2 = products[1] if len(products) > 1 else None
    p3 = products[2] if len(products) > 2 else None

    b1 = get_benchmarks(p1)
    deal1 = get_store_deals(p1)
    price_signal1 = get_price_signal(p1)

    theme = intent["theme"]
    is_comp = intent["is_comparison"] or len(products) >= 2 and any(k in query.lower() for k in ["compare", "vs", "which is better", "difference"])

    # 1. Direct Comparison Mode
    if is_comp and p2:
        b2 = get_benchmarks(p2)
        deal2 = get_store_deals(p2)
        price_diff = abs(p1.price - p2.price)
        cheaper = p1 if p1.price < p2.price else p2
        pricier = p2 if p1.price < p2.price else p1

        lines = [
            f"### 🥊 Head-to-Head Showdown: {p1.name} vs {p2.name}\n",
            "Here's the honest breakdown with **no cap, only specs**:\n",
            f"#### 1. Price & Store Deal Gap",
            f"- **{p1.name}**: {_format_inr(p1.price)} (Best Deal: **{deal1['best_deal_store']}** at {_format_inr(deal1['best_price'])})",
            f"- **{p2.name}**: {_format_inr(p2.price)} (Best Deal: **{deal2['best_deal_store']}** at {_format_inr(deal2['best_price'])})",
            f"- 💡 **Price Difference**: {cheaper.name} is **{_format_inr(price_diff)} cheaper**.\n",
            f"#### 2. Hardware & Muscle",
            f"- **Compute & Silicon**: {p1.brand}'s `{p1.processor}` vs {p2.brand}'s `{p2.processor}`",
            f"- **Graphics & Display**: `{p1.gpu}` on `{p1.display_tech}` vs `{p2.gpu}` on `{p2.display_tech}`",
            f"- **Memory & Storage**: {p1.ram_gb}GB RAM / {p1.storage_gb}GB SSD vs {p2.ram_gb}GB RAM / {p2.storage_gb}GB SSD\n",
            f"#### 3. Endurance & Portability",
            f"- **{p1.name}**: {p1.battery_hours}h battery | {p1.weight_kg}kg",
            f"- **{p2.name}**: {p2.battery_hours}h battery | {p2.weight_kg}kg\n",
            f"#### 🏆 SpecPlug Verdict",
        ]

        if p1.rating >= p2.rating and p1.price <= p2.price:
            lines.append(f"**Pick {p1.name}** all day. It gives you superior value, higher verified ratings ({p1.rating}★), and saves you {_format_inr(price_diff)}.")
        elif p1.battery_hours > p2.battery_hours:
            lines.append(f"If battery life and travel matter, **{p1.name}** wins with {p1.battery_hours}h endurance. If you need raw horsepower, check **{p2.name}**.")
        else:
            lines.append(f"Go with **{cheaper.name}** for value-for-money. If you need maximum specs, **{pricier.name}** justifies the premium.")

        reply = "\n".join(lines)
        prompts = [
            f"What are the cons of {p1.brand}?",
            f"Show 30-day price trend for {p2.name}",
            "Can I get student discounts on these?"
        ]
        return reply, prompts

    # 2. Coding / Programming Mode
    if theme == "coding":
        lines = [
            f"### 💻 Best Coding & Dev Machines (SpecPlug Curated)\n",
            f"For software engineering, Docker, and dev workflows in India, here are the top picks:\n",
            f"#### 🥇 Top Pick: **{p1.name}**",
            f"- **Price**: {_format_inr(p1.price)} • Verified Street Price",
            f"- **Silicon**: `{p1.processor}` | `{p1.ram_gb}GB RAM` ({p1.ram_expandability}) | `{p1.storage_gb}GB SSD`",
            f"- **Dev Endurance**: `{p1.battery_hours}h battery` • Weight: `{p1.weight_kg}kg`",
            f"- **Why developers love it**: {p1.pros[0] if p1.pros else 'Solid thermal stability and fast compilation speeds.'}",
            f"- ⚠️ **The Trade-off**: {p1.cons[0] if p1.cons else 'Non-expandable memory if purchased in base spec.'}\n"
        ]

        if p2:
            lines.extend([
                f"#### 🥈 Runner-Up Alternative: **{p2.name}**",
                f"- **Price**: {_format_inr(p2.price)} | `{p2.processor}` | `{p2.ram_gb}GB RAM`",
                f"- **Strengths**: {p2.pros[0] if p2.pros else 'Great screen and keyboard ergonomics.'}\n"
            ])

        lines.append(f"💡 **Developer Advice**: If running heavy local Docker containers or IntelliJ IDEA, prioritize at least 16GB RAM so you don't hit swap memory bottlenecks.")
        reply = "\n".join(lines)
        prompts = [
            "Is 16GB RAM enough for Python and Docker?",
            f"Compare {p1.name} with alternative",
            "Which store has the lowest price right now?"
        ]
        return reply, prompts

    # 3. Gaming & High-FPS Mode
    if theme == "gaming":
        fps = b1.get("gaming_fps") or {"CS2": 180, "Valorant": 300, "GTA_V": 90, "Cyberpunk_2077": 55}
        lines = [
            f"### 🎮 High-FPS Gaming Intel (SpecPlug Breakdown)\n",
            f"#### ⚡ Heavy Hitter: **{p1.name}**",
            f"- **Street Price**: {_format_inr(p1.price)} (Best Deal at **{deal1['best_deal_store']}**: {_format_inr(deal1['best_price'])})",
            f"- **GPU & CPU**: `{p1.gpu}` + `{p1.processor}`",
            f"- **Display**: `{p1.display_tech}`",
            f"- **Benchmark FPS Telemetry**:",
            f"  - **Counter-Strike 2**: `{fps.get('CS2', 150)}+ FPS`",
            f"  - **Valorant**: `{fps.get('Valorant', 250)}+ FPS`",
            f"  - **Cyberpunk 2077 (High)**: `{fps.get('Cyberpunk_2077', 50)}+ FPS`",
            f"- 🔥 **Pros**: {p1.pros[0] if p1.pros else 'High thermal ceiling and high refresh rate panel.'}",
            f"- ⚠️ **Catch**: {p1.cons[0] if p1.cons else 'Chassis runs warm under sustained load; keep vents clear.'}\n"
        ]
        if p2:
            lines.append(f"Need a cheaper alternative? **{p2.name}** is available at **{_format_inr(p2.price)}** with `{p2.gpu}`.")

        reply = "\n".join(lines)
        prompts = [
            f"How is the cooling and thermals on {p1.name}?",
            "What is the TGP wattage of this GPU?",
            "Find the best deal across Amazon and Flipkart"
        ]
        return reply, prompts

    # 4. Camera & Content Creation Mode
    if theme == "camera":
        lines = [
            f"### 📸 Creator & Camera Hardware Intelligence\n",
            f"#### 🥇 Flagship Camera Champ: **{p1.name}**",
            f"- **Price**: {_format_inr(p1.price)}",
            f"- **Display / Optics**: `{p1.display_tech}`",
            f"- **Hardware Engine**: `{p1.processor}` with dedicated neural image processing",
            f"- **Strengths**: {p1.pros[0] if p1.pros else 'Pro-grade optical stabilization and dynamic range.'}",
            f"- ⚠️ **Watchout**: {p1.cons[0] if p1.cons else 'Premium price tag.'}\n"
        ]
        if p2:
            lines.append(f"Also consider **{p2.name}** at {_format_inr(p2.price)} for exceptional portrait and video recording.")

        reply = "\n".join(lines)
        prompts = [
            f"How does the low-light camera perform on {p1.name}?",
            f"Compare {p1.name} vs {p2.name if p2 else 'competitor'}",
            "Which store offers the best exchange bonus?"
        ]
        return reply, prompts

    # 5. Battery & Travel Mode
    if theme == "battery_travel":
        # Sort by battery
        prods_by_battery = sorted(products, key=lambda x: x.battery_hours, reverse=True)
        top_bat = prods_by_battery[0]
        lines = [
            f"### 🔋 Road Warrior Battery & Travel Intel\n",
            f"Here are the devices built for all-day flights, library sessions, and zero-charger anxiety:\n",
            f"#### 🥇 Battery Champion: **{top_bat.name}**",
            f"- **Endurance**: **{top_bat.battery_hours} Hours** verified playback / workflow",
            f"- **Weight**: `{top_bat.weight_kg} kg` (Lightweight unibody)",
            f"- **Price**: {_format_inr(top_bat.price)} • Signal: `{price_signal1['signal']}`",
            f"- **Pros**: {top_bat.pros[0] if top_bat.pros else 'Epic battery life and whisper-quiet operation.'}\n"
        ]
        if len(prods_by_battery) > 1:
            second_bat = prods_by_battery[1]
            lines.append(f"**Runner-Up**: **{second_bat.name}** delivers **{second_bat.battery_hours}h** at {_format_inr(second_bat.price)}.")

        reply = "\n".join(lines)
        prompts = [
            f"Can {top_bat.name} charge via USB-C Power Delivery?",
            "What is the real-world battery under heavy load?",
            "Compare weight with other ultrabooks"
        ]
        return reply, prompts

    # 6. Budget & Value Mode
    if theme == "budget_value" or intent["max_budget"]:
        budget_str = f" under {_format_inr(intent['max_budget'])}" if intent["max_budget"] else ""
        lines = [
            f"### 💰 Value Champions{budget_str} (Maximum Bang for Rupee)\n",
            f"Here are the highest-rated devices giving you maximum specs per Rupee spent:\n",
            f"#### 1. **{p1.name}** — Top Value Champion",
            f"- **Street Price**: {_format_inr(p1.price)} (MSRP: {_format_inr(price_signal1['msrp'])})",
            f"- **Deal Alert**: Best price on **{deal1['best_deal_store']}** at {_format_inr(deal1['best_price'])}",
            f"- **Specs**: `{p1.processor}` | `{p1.ram_gb}GB RAM` | `{p1.storage_gb}GB SSD` | `{p1.display_tech}`",
            f"- **Why it's a steal**: {p1.pros[0] if p1.pros else 'Best spec-to-rupee ratio in this segment.'}",
            f"- ⚠️ **Watchout**: {p1.cons[0] if p1.cons else 'Check RAM expandability if planning long-term upgrade.'}\n"
        ]
        if p2:
            lines.append(f"#### 2. **{p2.name}** at {_format_inr(p2.price)} is another prime contender ({p2.rating}★).")

        reply = "\n".join(lines)
        prompts = [
            "What bank credit card offers are available?",
            "Is the RAM upgradeable on this model?",
            "What is the all-time low price?"
        ]
        return reply, prompts

    # 7. General Dynamic Hardware Overview
    lines = [
        f"### 🔌 SpecPlug Hardware Intel: **{p1.name}**\n",
        f"Here's the lowdown on the top match for your query (`{p1.category.upper()}` segment):\n",
        f"- 🏷️ **Price**: {_format_inr(p1.price)} *(Best Store Deal: **{deal1['best_deal_store']}** at {_format_inr(deal1['best_price'])})*",
        f"- ⚙️ **Specs**: `{p1.processor}` • `{p1.ram_gb}GB RAM` • `{p1.storage_gb}GB SSD`",
        f"- 🖥️ **Display**: `{p1.display_tech}`",
        f"- 🔋 **Endurance**: `{p1.battery_hours}h` • Weight: `{p1.weight_kg}kg`",
        f"- ⭐ **Rating**: `{p1.rating} / 5.0` verified customer score",
        f"- 🔥 **The Good**: {p1.pros[0] if p1.pros else 'Outstanding daily performance.'}",
        f"- ⚠️ **The Catch**: {p1.cons[0] if p1.cons else 'No bundled Microsoft Office / basic webcam.'}\n"
    ]
    if p2:
        lines.append(f"💡 **Alternative to consider**: **{p2.name}** ({_format_inr(p2.price)}) if you want {p2.brand}'s ecosystem.")

    reply = "\n".join(lines)
    prompts = [
        f"Compare {p1.name} vs {p2.name if p2 else 'alternative'}",
        f"Show me pros and cons of {p1.name}",
        "Which website has the best deal right now?"
    ]
    return reply, prompts

@router.post("/copilot", response_model=CopilotResponse)
def copilot_chat(request: CopilotRequest, db: Session = Depends(get_db)):
    """Handles conversational hardware queries with grounded telemetry and Gen-Z expertise."""
    all_prods = db.query(Product).all()
    if not semantic_engine.is_fitted and all_prods:
        semantic_engine.index_products(all_prods)

    intent = _parse_query_intent(request.query)
    top_products = _select_relevant_products(
        query=request.query,
        all_prods=all_prods,
        active_ids=request.active_product_ids or [],
        intent=intent
    )

    # Format relevant products for frontend interactive cards
    relevant_products_dicts = []
    for p in top_products:
        deal = get_store_deals(p)
        relevant_products_dicts.append({
            "id": p.id,
            "name": p.name,
            "brand": p.brand,
            "category": p.category,
            "price": p.price,
            "formatted_price": _format_inr(p.price),
            "processor": p.processor,
            "ram_gb": p.ram_gb,
            "storage_gb": p.storage_gb,
            "rating": p.rating,
            "product_url": p.product_url or f"https://www.amazon.in/s?k={p.name.replace(' ', '+')}",
            "retail_source": p.retail_source or "Amazon India",
            "best_deal_store": deal.get("best_deal_store", "Amazon India"),
            "best_price": deal.get("best_price", p.price),
            "formatted_best_price": deal.get("formatted_best_price", _format_inr(p.price)),
            "savings_vs_highest": deal.get("savings_vs_highest", 0),
            "deal_comparison": deal
        })

    api_key = os.environ.get("GEMINI_API_KEY", "").strip()

    # If Gemini API key is configured, attempt live LLM generation with grounded context
    if api_key and HAS_GENAI:
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-2.0-flash')

            # Build grounded context
            context_blocks = []
            for p in top_products:
                b = get_benchmarks(p)
                deal = get_store_deals(p)
                context_blocks.append(
                    f"Product: {p.name} ({p.brand})\n"
                    f"Category: {p.category} | Price: ₹{p.price} (Best Deal: {deal['best_deal_store']} at ₹{deal['best_price']})\n"
                    f"Specs: {p.processor}, {p.ram_gb}GB RAM, {p.storage_gb}GB SSD, {p.gpu}, {p.battery_hours}h battery, {p.weight_kg}kg\n"
                    f"Pros: {p.pros}\n"
                    f"Cons: {p.cons}\n"
                )
            context_str = "\n".join(context_blocks)

            system_prompt = (
                "You are SpecPlug, the ultimate Gen-Z AI hardware expert and electronics advisor for the Indian market (₹ INR). "
                "Tagline: 'Skill issue? Nah, spec diff. No cap, only specs.' "
                "You are witty, highly knowledgeable, sharp, and honest. You never hallucinate specs or US prices. "
                "Ground all answers ONLY in this verified Indian product data:\n"
                f"{context_str}\n\n"
                "Format responses cleanly in Markdown with bold product names and bullet points. "
                "Directly answer the user's specific question."
            )

            history_msgs = []
            for msg in request.history:
                role = "user" if msg.role == "user" else "model"
                history_msgs.append({"role": role, "parts": [msg.content]})

            chat = model.start_chat(history=history_msgs)
            response = chat.send_message(system_prompt + "\n\nUser Question: " + request.query)
            
            if response and response.text:
                suggested_prompts = [
                    f"What are the trade-offs of {top_products[0].name}?",
                    "Which retailer has the lowest price right now?",
                    "Compare battery life and cooling"
                ]
                return CopilotResponse(
                    reply=response.text,
                    relevant_products=relevant_products_dicts,
                    suggested_prompts=suggested_prompts
                )
        except Exception:
            # Fall back smoothly to standalone intelligent advisor engine
            pass

    # Attempt local fine-tuned Qwen-2.5-1.5B LoRA on RTX 3050 if enabled
    use_local_llm = os.environ.get("USE_LOCAL_LLM", "false").lower() in ("true", "1", "yes")
    if use_local_llm:
        try:
            from app.services.local_llm_service import generate_specplug_reply, is_local_model_available
            if is_local_model_available():
                # Build context string if not already built
                if 'context_str' not in locals():
                    context_blocks = []
                    for p in top_products:
                        deal = get_store_deals(p)
                        context_blocks.append(
                            f"Product: {p.name} ({p.brand})\n"
                            f"Category: {p.category} | Price: ₹{p.price} (Best Deal: {deal['best_deal_store']} at ₹{deal['best_price']})\n"
                            f"Specs: {p.processor}, {p.ram_gb}GB RAM, {p.storage_gb}GB SSD, {p.gpu}, {p.battery_hours}h battery, {p.weight_kg}kg\n"
                        )
                    context_str = "\n".join(context_blocks)

                local_reply = generate_specplug_reply(request.query, context_str)
                if local_reply:
                    suggested_prompts = [
                        f"What are the trade-offs of {top_products[0].name}?",
                        "Which retailer has the lowest price right now?",
                        "Compare battery life and cooling"
                    ]
                    return CopilotResponse(
                        reply=local_reply,
                        relevant_products=relevant_products_dicts,
                        suggested_prompts=suggested_prompts
                    )
        except Exception:
            pass

    # Standalone High-Intelligence Advisor Engine (Zero External API requirement)
    reply, suggested_prompts = _generate_specplug_standalone_advice(
        query=request.query,
        products=top_products,
        intent=intent
    )

    return CopilotResponse(
        reply=reply,
        relevant_products=relevant_products_dicts,
        suggested_prompts=suggested_prompts
    )
