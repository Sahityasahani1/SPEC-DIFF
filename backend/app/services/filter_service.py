"""Deterministic Hard-Constraint Filtering Engine."""
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models import Product
from app.schemas import RecommendationRequest

ZERO_RAM_CATEGORIES = {"audio", "headphones", "smartwatch", "watch", "monitor", "accessories"}

def apply_hard_filters(
    products: List[Product],
    max_budget: float,
    min_ram_gb: int = 0,
    min_storage_gb: int = 0,
    brand: Optional[str] = None,
    category: Optional[str] = None
) -> List[Product]:
    """
    Applies strict deterministic filter conditions in memory.
    Guarantees:
      - price <= max_budget
      - ram_gb >= min_ram_gb (for computing categories)
      - storage_gb >= min_storage_gb (for computing categories)
      - in_stock is True
      - brand matches if specified (case-insensitive)
      - category matches if specified and != 'all'
    Zero tolerance for constraint violations.
    """
    eligible = []
    brand_clean = brand.strip().lower() if brand and brand.strip() and brand.strip().lower() != "any" else None
    cat_clean = category.strip().lower() if category and category.strip() and category.strip().lower() != "all" else None

    for p in products:
        if not p.in_stock:
            continue
        if p.price > max_budget:
            continue
        if cat_clean and p.category.strip().lower() != cat_clean:
            continue
        
        # Only enforce RAM/storage floor if category is computing-based or explicitly required
        prod_cat = (p.category or "").strip().lower()
        if prod_cat not in ZERO_RAM_CATEGORIES:
            if min_ram_gb > 0 and p.ram_gb < min_ram_gb:
                continue
            if min_storage_gb > 0 and p.storage_gb < min_storage_gb:
                continue

        if brand_clean and p.brand.strip().lower() != brand_clean:
            continue
        eligible.append(p)

    return eligible

def filter_products(db: Session, request: RecommendationRequest) -> List[Product]:
    """
    Queries database applying hard filters directly at SQL level for maximum performance.
    """
    query = db.query(Product).filter(
        Product.in_stock == True,
        Product.price <= request.max_budget
    )

    req_cat = (request.category or "").strip().lower()
    if req_cat and req_cat != "all":
        query = query.filter(Product.category == req_cat)

    # Only enforce RAM/storage floors for computing categories or if min_ram_gb was explicitly required
    if req_cat not in ZERO_RAM_CATEGORIES:
        if request.min_ram_gb > 0:
            query = query.filter(Product.ram_gb >= request.min_ram_gb)
        if request.min_storage_gb > 0:
            query = query.filter(Product.storage_gb >= request.min_storage_gb)

    if request.brand and request.brand.strip() and request.brand.strip().lower() != "any":
        query = query.filter(Product.brand.ilike(request.brand.strip()))

    return query.all()
