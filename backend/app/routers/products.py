"""Products Catalog Router (GET /api/products, PATCH /api/products/{id}/stock)."""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Product
from app.schemas import ProductStockUpdate
from app.services.vector_service import semantic_engine

router = APIRouter(prefix="/api/products", tags=["Products"])

@router.get("")
def list_products(
    category: Optional[str] = None,
    brand: Optional[str] = None,
    in_stock_only: bool = True,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    limit: int = Query(60, ge=1, le=200),
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

    total = query.count()
    products = query.order_by(Product.price.asc()).offset(offset).limit(limit).all()
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "products": [p.to_dict() for p in products]
    }

@router.get("/{product_id}")
def get_product(product_id: str, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    return product.to_dict()

@router.patch("/{product_id}/stock")
def update_product_stock(
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

    return {
        "status": "success",
        "product_id": product.id,
        "name": product.name,
        "in_stock": product.in_stock,
        "message": f"Stock status updated to {'in stock' if product.in_stock else 'out of stock'}."
    }
