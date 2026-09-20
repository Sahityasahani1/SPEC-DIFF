"""Side-by-Side Product Comparison Service."""
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models import Product
from app.schemas import ComparisonResponse, ComparisonProduct
from app.services.ranking_service import get_cpu_score, get_gpu_score

def compare_products(db: Session, product_ids: List[str], priority: str = "value") -> ComparisonResponse:
    """
    Compares 2 or 3 products across specifications and designates the priority winner.
    """
    products = db.query(Product).filter(Product.id.in_(product_ids)).all()
    if len(products) < len(product_ids):
        found_ids = {p.id for p in products}
        missing = [pid for pid in product_ids if pid not in found_ids]
        raise ValueError(f"Products not found in catalog: {', '.join(missing)}")

    # Sort in the order requested by the user
    product_map = {p.id: p for p in products}
    ordered_products = [product_map[pid] for pid in product_ids if pid in product_map]

    prio = priority.lower().strip()
    winner_id: Optional[str] = None
    winner_reason: Optional[str] = None

    if prio == "battery":
        winner = max(ordered_products, key=lambda p: p.battery_hours)
        winner_id = winner.id
        winner_reason = f"{winner.name} delivers the highest battery endurance ({winner.battery_hours} hours)."
    elif prio == "portability":
        winner = min(ordered_products, key=lambda p: p.weight_kg)
        winner_id = winner.id
        winner_reason = f"{winner.name} is the most lightweight at {winner.weight_kg} kg."
    elif prio == "price":
        winner = min(ordered_products, key=lambda p: p.price)
        winner_id = winner.id
        winner_reason = f"{winner.name} is the most budget-friendly at ₹{int(winner.price):,}."
    elif prio == "performance":
        def perf_score(p: Product):
            return 0.4 * get_gpu_score(p.gpu) + 0.4 * get_cpu_score(p.processor) + 0.2 * (p.ram_gb / 32.0 * 100)
        winner = max(ordered_products, key=perf_score)
        winner_id = winner.id
        winner_reason = f"{winner.name} offers the strongest overall computing performance with {winner.processor} and {winner.gpu}."
    else:  # value
        def val_score(p: Product):
            spec_pts = (p.ram_gb / 16.0) + (p.storage_gb / 512.0) + (p.battery_hours / 8.0)
            return spec_pts / (p.price / 50000.0)
        winner = max(ordered_products, key=val_score)
        winner_id = winner.id
        winner_reason = f"{winner.name} offers the highest specification-to-price value in the Indian market."

    comp_products = []
    for p in ordered_products:
        pros_list = [pr.strip() for pr in p.pros.split(";") if pr.strip()]
        cons_list = [c.strip() for c in p.cons.split(";") if c.strip()]
        comp_products.append(
            ComparisonProduct(
                id=p.id,
                name=p.name,
                brand=p.brand,
                price=p.price,
                formatted_price=f"₹{int(p.price):,}",
                ram_gb=p.ram_gb,
                storage_gb=p.storage_gb,
                processor=p.processor,
                gpu=p.gpu,
                battery_hours=p.battery_hours,
                weight_kg=p.weight_kg,
                rating=p.rating,
                ram_expandability=p.ram_expandability,
                bundled_software=p.bundled_software,
                display_tech=p.display_tech,
                retail_source=p.retail_source,
                product_url=p.product_url,
                pros=pros_list,
                cons=cons_list,
                is_winner=(p.id == winner_id)
            )
        )

    return ComparisonResponse(
        comparison_count=len(comp_products),
        priority=priority,
        priority_winner_id=winner_id,
        winner_reason=winner_reason,
        products=comp_products
    )
