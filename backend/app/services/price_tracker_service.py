import random
import datetime

FESTIVAL_CALENDAR = [
    (1, 26, 26, "Republic Day", 0.10),
    (3, 14, 15, "Holi", 0.08),
    (8, 15, 15, "Independence Day", 0.10),
    (9, 25, 30, "Amazon Great Indian", 0.15),
    (10, 5, 10, "Flipkart BBD", 0.15),
    (10, 20, 22, "Diwali", 0.12),
    (12, 25, 26, "Christmas", 0.10)
]

def get_price_signal(product):
    random.seed(hash(str(product.id)))
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

    msrp = current_price * random.uniform(1.08, 1.20)
    msrp = round(msrp / 99) * 99

    today = datetime.date(2026, 9, 20)
    price_history = []
    
    for i in range(29, -1, -1):
        d = today - datetime.timedelta(days=i)
        
        base = current_price * random.uniform(0.97, 1.03)
        
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
