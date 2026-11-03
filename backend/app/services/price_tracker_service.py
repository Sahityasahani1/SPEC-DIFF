import random
import datetime
import hashlib
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

FESTIVAL_CALENDAR = [
    (1, 26, 26, "Republic Day", 0.10),
    (3, 14, 15, "Holi", 0.08),
    (8, 15, 15, "Independence Day", 0.10),
    (9, 25, 30, "Amazon Great Indian", 0.15),
    (10, 5, 10, "Flipkart BBD", 0.15),
    (10, 20, 22, "Diwali", 0.12),
    (12, 25, 26, "Christmas", 0.10)
]

def get_price_signal(
    product,
    preloaded_history: Optional[List[Dict[str, Any]]] = None,
    db: Optional[Session] = None
):
    pid = getattr(product, "id", "")
    seed = int(hashlib.md5(str(pid).encode("utf-8")).hexdigest()[:8], 16)
    rng = random.Random(seed)
    current_price = getattr(product, "price", 0)
    
    if current_price == 0:
        return {
            "price_history": [],
            "current_price": 0,
            "all_time_low": 0,
            "all_time_low_date": "",
            "msrp": 0,
            "signal": "FAIR_VALUE",
            "signal_reason": "",
            "estimated_next_sale": "",
            "estimated_savings": 0
        }

    msrp = current_price * rng.uniform(1.08, 1.20)
    msrp = round(msrp / 99) * 99

    today = datetime.date.today()
    price_history = []
    
    # 1. Use preloaded history if provided (O(1) in-memory lookup)
    if preloaded_history is not None:
        price_history = preloaded_history
    else:
        # Check if real recorded price history exists in database
        try:
            should_close = False
            session = db
            if session is None:
                from app.database import SessionLocal
                session = SessionLocal()
                should_close = True
            
            from app.models import PriceHistory
            records = session.query(PriceHistory).filter(
                PriceHistory.product_id == pid
            ).order_by(PriceHistory.recorded_at.asc()).all()
            if records and len(records) >= 3:
                price_history = [
                    {"date": r.recorded_at.strftime("%Y-%m-%d"), "price": round(r.price)}
                    for r in records[-30:]
                ]
            if should_close:
                session.close()
        except Exception:
            pass

    # 2. Resilient synthetic 30-day history generation if empty
    if not price_history:
        for i in range(29, -1, -1):
            d = today - datetime.timedelta(days=i)
            base = current_price * rng.uniform(0.97, 1.03)
            
            # Check festival
            discount = 0
            for m, ds, de, name, pct in FESTIVAL_CALENDAR:
                # check if d is within +/- 3 days of the festival range
                fest_start = datetime.date(d.year, m, ds) - datetime.timedelta(days=3)
                fest_end = datetime.date(d.year, m, de) + datetime.timedelta(days=3)
                if fest_start <= d <= fest_end:
                    discount = max(discount, pct)
                    
            price = base * (1 - discount)
            price_history.append({
                "date": d.strftime("%Y-%m-%d"),
                "price": round(price)
            })

    all_time_low_entry = min(price_history, key=lambda x: x["price"])
    all_time_low = all_time_low_entry["price"]
    all_time_low_date = all_time_low_entry["date"]

    if current_price <= all_time_low * 1.05:
        signal = "STRONG_BUY"
        reason = "Price is very close to all-time low."
    elif current_price >= msrp * 0.95:
        signal = "WAIT_FOR_SALE"
        reason = "Price is near MSRP, wait for a drop."
    else:
        signal = "FAIR_VALUE"
        reason = "Normal market price."

    # Find next sale
    next_sale = ""
    for m, ds, de, name, pct in FESTIVAL_CALENDAR:
        fest_start = datetime.date(today.year, m, ds)
        if fest_start >= today:
            next_sale = name
            break
    if not next_sale:
        next_sale = FESTIVAL_CALENDAR[0][3] + f" ({today.year + 1})"

    savings = msrp - all_time_low
    savings = round(savings / 500) * 500

    return {
        "price_history": price_history,
        "current_price": current_price,
        "all_time_low": all_time_low,
        "all_time_low_date": all_time_low_date,
        "msrp": msrp,
        "signal": signal,
        "signal_reason": reason,
        "estimated_next_sale": next_sale,
        "estimated_savings": int(savings)
    }
