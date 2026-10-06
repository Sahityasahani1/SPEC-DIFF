"""Products Catalog Router (GET /api/products, PATCH /api/products/{id}/stock)."""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models import Product
from app.schemas import ProductStockUpdate
from app.services.vector_service import semantic_engine
from app.services.cache_service import cache_service
from app.services.benchmark_service import get_benchmarks
from app.services.price_tracker_service import get_price_signal
from app.services.store_deals_service import get_store_deals

router = APIRouter(prefix="/api/products", tags=["Products"])

@router.get("")
def list_products(
    q: Optional[str] = None,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    in_stock_only: bool = True,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort_by: Optional[str] = "relevance",
    limit: int = Query(60, ge=1, le=250),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(Product)
    if in_stock_only:
        query = query.filter(Product.in_stock == True)
    if category and category.strip().lower() != "all":
        query = query.filter(Product.category == category.strip().lower())
    if brand and brand.strip().lower() != "any":
        query = query.filter(Product.brand.ilike(brand.strip()))
    if min_price is not None:
        query = query.filter(Product.price >= min_price)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)

    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Product.name.ilike(term),
                Product.brand.ilike(term),
                Product.category.ilike(term),
                Product.processor.ilike(term),
                Product.gpu.ilike(term),
                Product.description.ilike(term),
                Product.display_tech.ilike(term),
                Product.pros.ilike(term),
                Product.cons.ilike(term),
            )
        )

    total = query.count()

    if sort_by == "price_asc":
        query = query.order_by(Product.price.asc())
    elif sort_by == "price_desc":
        query = query.order_by(Product.price.desc())
    elif sort_by == "rating_desc":
        query = query.order_by(Product.rating.desc())
    else:
        query = query.order_by(Product.rating.desc(), Product.price.asc())

    products = query.offset(offset).limit(limit).all()

    from collections import Counter
    all_categories = db.query(Product.category).filter(Product.in_stock == True).all()
    category_counts = dict(Counter([c[0] for c in all_categories]))

    items = []
    for p in products:
        d = p.to_dict()
        b = get_benchmarks(p)
        if b.get("geekbench_single"):
            d["benchmarks"] = b
        d["price_signal"] = get_price_signal(p)
        d["deal_comparison"] = get_store_deals(p)
        items.append(d)

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "categories": category_counts,
        "products": items
    }

@router.get("/{product_id}")
def get_product(product_id: str, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    d = product.to_dict()
    b = get_benchmarks(product)
    if b.get("geekbench_single"):
        d["benchmarks"] = b
    d["price_signal"] = get_price_signal(product)
    d["deal_comparison"] = get_store_deals(product)
    return d

@router.patch("/{product_id}/stock")
async def update_product_stock(
    product_id: str,
    payload: ProductStockUpdate,
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    
    product.in_stock = payload.in_stock
    db.commit()

    # Re-index semantic engine with updated catalog
    all_products = db.query(Product).all()
    semantic_engine.index_products(all_products)

    # Invalidate recommendation cache
    await cache_service.invalidate_catalog_cache()

    return {
        "status": "success",
        "product_id": product.id,
        "name": product.name,
        "in_stock": product.in_stock,
        "message": f"Stock status updated to {'in stock' if product.in_stock else 'out of stock'}."
    }
