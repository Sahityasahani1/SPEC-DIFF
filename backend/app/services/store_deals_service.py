"""Multi-Store Price Comparison and Best Deal Intelligence Service.
Simulates live pricing across major Indian retailers:
Amazon India, Flipkart, Croma, Reliance Digital, and Official Brand Stores.
"""
import random
from typing import Dict, Any, List
from urllib.parse import quote_plus

RETAILER_METADATA = {
    "amazon": {
        "name": "Amazon India",
        "domain": "amazon.in",
        "logo_text": "Amazon",
        "color": "#ff9900",
        "delivery": "Prime Free 1-Day Delivery",
        "return_policy": "7 Days Returnable",
        "bank_offer": "Flat ₹2,500 off on HDFC/ICICI Bank Cards",
        "rating": 4.7
    },
    "flipkart": {
        "name": "Flipkart",
        "domain": "flipkart.com",
        "logo_text": "Flipkart",
        "color": "#2874f0",
        "delivery": "Express Delivery by Tomorrow",
        "return_policy": "7 Days Replacement",
        "bank_offer": "₹3,000 Instant Discount on Axis/SBI Credit Cards",
        "rating": 4.6
    },
    "croma": {
        "name": "Croma",
        "domain": "croma.com",
        "logo_text": "Croma",
        "color": "#00e676",
        "delivery": "Free Delivery (2-3 Days) or Store Pickup",
        "return_policy": "15 Days Store Warranty",
        "bank_offer": "5% NeuCoins on Tata Neu HDFC Cards",
        "rating": 4.4
    },
    "reliance": {
        "name": "Reliance Digital",
        "domain": "reliancedigital.in",
        "logo_text": "Reliance Digital",
        "color": "#e50914",
        "delivery": "Same-Day / Next-Day Express Delivery",
        "return_policy": "7 Days Store Replacement",
        "bank_offer": "₹2,000 Instant Bank Discount on Credit Cards",
        "rating": 4.3
    },
    "official": {
        "name": "Official Brand Store",
        "domain": "official.com",
        "logo_text": "Brand Store",
        "color": "#111827",
        "delivery": "Insured Official Brand White-Glove Shipping",
        "return_policy": "Manufacturer Direct 1-Year Onsite Warranty",
        "bank_offer": "Official Student Discount & Corporate Perks",
        "rating": 4.9
    }
}

def make_retailer_url(store_id: str, product_name: str, brand: str) -> str:
    query = quote_plus(f"{product_name} {brand}".strip())
    brand_lower = (brand or "").lower()
    
    if store_id == "flipkart":
        return f"https://www.flipkart.com/search?q={query}"
    elif store_id == "croma":
        return f"https://www.croma.com/searchB?q={query}"
    elif store_id == "reliance":
        return f"https://www.reliancedigital.in/search?q={query}"
    elif store_id == "official":
        if "apple" in brand_lower:
            return "https://www.apple.com/in/shop"
        elif "samsung" in brand_lower:
            return "https://www.samsung.com/in"
        elif "lenovo" in brand_lower:
            return "https://www.lenovo.com/in/en"
        elif "asus" in brand_lower:
            return "https://in.store.asus.com"
        elif "dell" in brand_lower:
            return "https://www.dell.com/en-in"
        elif "sony" in brand_lower:
            return "https://shopatsc.com"
        elif "hp" in brand_lower:
            return "https://www.hp.com/in-en/shop"
        return f"https://www.google.com/search?q={query}+official+store+india"
    
    # Default to Amazon India
    return f"https://www.amazon.in/s?k={query}"

def get_store_deals(product) -> Dict[str, Any]:
    """Generates deterministic, realistic multi-store price comparison telemetry
    across major Indian retailers for a given product.
    """
    pid = getattr(product, "id", "product_default")
    base_price = float(getattr(product, "price", 0) or 0)
    name = getattr(product, "name", "Electronic Device")
    brand = getattr(product, "brand", "Brand")

    if base_price <= 0:
        return {
            "best_deal_store": "Amazon India",
            "best_price": 0,
            "formatted_best_price": "₹0",
            "savings_vs_highest": 0,
            "savings_pct": 0,
            "stores": []
        }

    # Deterministic seed per product ID
    random.seed(hash(f"{pid}_store_deals_2026_seed"))

    # Generate multipliers for 5 stores
    # Amazon and Flipkart are competitive and close to base_price
    # Croma & Reliance Digital have retail store markups
    # Official Store has MSRP pricing
    multipliers = {
        "flipkart": random.uniform(0.97, 1.03),
        "amazon": random.uniform(0.975, 1.035),
        "croma": random.uniform(1.02, 1.08),
        "reliance": random.uniform(1.01, 1.07),
        "official": random.uniform(1.06, 1.15)
    }

    # Force at least one store to equal or slightly undercut the base_price
    min_store = random.choice(["flipkart", "amazon"])
    multipliers[min_store] = 0.985 if base_price > 10000 else 0.99

    stores_list = []
    prices = {}

    for store_id, meta in RETAILER_METADATA.items():
        raw_price = base_price * multipliers[store_id]
        
        # Round price cleanly like Indian retail prices (end in 90 or 99 or 00)
        if raw_price > 20000:
            price = round(raw_price / 100) * 100 - 10  # e.g. 74,990
        elif raw_price > 2000:
            price = round(raw_price / 50) * 50 - 1   # e.g. 4,999
        else:
            price = round(raw_price / 10) * 10 - 1   # e.g. 999

        # Ensure price is at least 99
        price = max(99.0, float(price))
        prices[store_id] = price

    # Find the best deal store (lowest price)
    best_store_id = min(prices, key=prices.get)
    best_price = prices[best_store_id]
    highest_price = max(prices.values())
    savings_vs_highest = max(0.0, highest_price - best_price)
    savings_pct = round((savings_vs_highest / highest_price) * 100, 1) if highest_price > 0 else 0.0

    for store_id, meta in RETAILER_METADATA.items():
        price = prices[store_id]
        is_best = (store_id == best_store_id)
        
        # In stock status: mostly true, occasionally limited stock
        stock_rand = random.random()
        stock_status = "In Stock" if stock_rand > 0.15 else "Limited Stock (Only 2 left)"

        # Effective price after bank offer
        bank_disc = 2500 if ("2,500" in meta["bank_offer"] and price > 20000) else (
            3000 if ("3,000" in meta["bank_offer"] and price > 25000) else (
                2000 if ("2,000" in meta["bank_offer"] and price > 15000) else (
                    round(price * 0.05) if "5%" in meta["bank_offer"] else 0
                )
            )
        )
        effective_price = max(99.0, price - bank_disc)

        stores_list.append({
            "store_id": store_id,
            "store_name": meta["name"],
            "domain": meta["domain"],
            "logo_text": meta["logo_text"],
            "color": meta["color"],
            "price": price,
            "formatted_price": f"₹{int(price):,}",
            "in_stock": True,
            "stock_status": stock_status,
            "delivery": meta["delivery"],
            "bank_offer": meta["bank_offer"],
            "effective_price": effective_price,
            "formatted_effective_price": f"₹{int(effective_price):,}",
            "is_best_deal": is_best,
            "rating": meta["rating"],
            "return_policy": meta["return_policy"],
            "deal_url": make_retailer_url(store_id, name, brand)
        })

    # Sort stores so the best deal is always first
    stores_list.sort(key=lambda s: (not s["is_best_deal"], s["price"]))

    return {
        "best_deal_store": RETAILER_METADATA[best_store_id]["name"],
        "best_deal_store_id": best_store_id,
        "best_price": best_price,
        "formatted_best_price": f"₹{int(best_price):,}",
        "highest_price": highest_price,
        "formatted_highest_price": f"₹{int(highest_price):,}",
        "savings_vs_highest": int(savings_vs_highest),
        "savings_pct": savings_pct,
        "stores_count": len(stores_list),
        "stores": stores_list
    }
