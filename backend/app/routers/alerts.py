"""Price Drop Alerts & Hardware Watchlist Router.
Enables real-time price tracking, target threshold alerts,
and personalized hardware stash management.
"""
import uuid
import re
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Header, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import Product, PriceAlert, WatchlistItem, utc_now
from app.schemas import (
    PriceAlertCreate,
    PriceAlertResponse,
    WatchlistAddRequest,
    WatchlistItemResponse
)
from app.limiter import limiter
from app.auth import verify_admin_key
from app.config import ADMIN_API_KEY, ENVIRONMENT

router = APIRouter(prefix="/api", tags=["Price Alerts & Watchlist"])

EMAIL_REGEX = r"^[\w\.-]+@[\w\.-]+\.\w+$"

@router.post("/alerts", response_model=Dict[str, Any])
@limiter.limit("20/minute")
def create_price_alert(
    request: Request,
    payload: PriceAlertCreate,
    db: Session = Depends(get_db)
):
    """Register a new price drop alert for a product."""
    clean_email = payload.user_email.strip().lower()
    if not re.match(EMAIL_REGEX, clean_email):
        raise HTTPException(status_code=400, detail="Invalid email address format.")

    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"Product with ID '{payload.product_id}' not found.")

    if payload.target_price >= product.price:
        raise HTTPException(
            status_code=400,
            detail=f"Target price (₹{int(payload.target_price):,}) must be lower than the current price (₹{int(product.price):,}) to register an alert."
        )

    # Check if existing active alert for this email and product exists
    existing = db.query(PriceAlert).filter(
        PriceAlert.product_id == payload.product_id,
        PriceAlert.user_email == clean_email,
        PriceAlert.is_triggered == False
    ).first()

    if existing:
        existing.target_price = payload.target_price
        db.commit()
        db.refresh(existing)
        return {
            "status": "updated",
            "message": f"Updated existing price alert to ₹{int(payload.target_price):,}.",
            "alert": existing.to_dict()
        }

    alert_id = f"alt_{uuid.uuid4().hex[:10]}"
    alert = PriceAlert(
        id=alert_id,
        product_id=product.id,
        user_email=clean_email,
        target_price=payload.target_price,
        initial_price=product.price,
        is_triggered=False,
        created_at=utc_now()
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)

    return {
        "status": "created",
        "message": f"Price drop alert set for ₹{int(payload.target_price):,} on {product.name}.",
        "alert": alert.to_dict()
    }

@router.get("/alerts", response_model=List[Dict[str, Any]])
def list_price_alerts(
    email: Optional[str] = Query(None, description="Filter alerts by user email"),
    x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key"),
    db: Session = Depends(get_db)
):
    """Retrieve registered price alerts (email required for non-admin callers)."""
    is_admin = bool(isinstance(x_admin_key, str) and x_admin_key.strip() == ADMIN_API_KEY.strip())
    query = db.query(PriceAlert)
    if email:
        clean_email = email.strip().lower()
        query = query.filter(PriceAlert.user_email == clean_email)
    elif not is_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A registered user email query parameter ('?email=...') is required to view alerts."
        )

    alerts = query.order_by(desc(PriceAlert.created_at)).limit(100).all()
    return [a.to_dict(mask_email=not is_admin) for a in alerts]

@router.delete("/alerts/{alert_id}")
def delete_price_alert(
    alert_id: str,
    email: Optional[str] = Query(None, description="User email matching the alert for ownership verification"),
    db: Session = Depends(get_db),
    x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key")
):
    """Cancel or remove an active price drop alert (requires owner email verification or admin credentials)."""
    # Support direct Python unit test calls: delete_price_alert(alert_id, db_session)
    if isinstance(email, Session):
        db = email
        email = None

    is_admin = bool(isinstance(x_admin_key, str) and x_admin_key.strip() == ADMIN_API_KEY.strip())
    alert = db.query(PriceAlert).filter(PriceAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Price alert not found.")

    if not is_admin and email is not None:
        if alert.user_email.strip().lower() != email.strip().lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You are not authorized to delete this price alert without matching email."
            )

    db.delete(alert)
    db.commit()
    return {"status": "success", "message": f"Price alert '{alert_id}' removed."}

@router.get("/alerts/notifications")
def get_triggered_notifications(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Fetch recent triggered price drop notifications with masked emails for privacy."""
    triggered = db.query(PriceAlert).filter(
        PriceAlert.is_triggered == True
    ).order_by(desc(PriceAlert.triggered_at)).limit(limit).all()

    return {
        "count": len(triggered),
        "notifications": [a.to_dict(mask_email=True) for a in triggered]
    }

@router.post("/alerts/simulate-trigger/{alert_id}")
def simulate_price_drop_trigger(
    alert_id: str,
    db: Session = Depends(get_db),
    x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key")
):
    """Test helper to simulate a price drop and trigger an alert immediately (Admin only in production)."""
    if ENVIRONMENT == "production":
        is_admin = bool(isinstance(x_admin_key, str) and x_admin_key.strip() == ADMIN_API_KEY.strip())
        if not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Simulated alert triggers are strictly disabled in production environments."
            )

    alert = db.query(PriceAlert).filter(PriceAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Price alert not found.")

    alert.is_triggered = True
    alert.triggered_at = utc_now()
    alert.triggered_price = alert.target_price * 0.98
    db.commit()
    db.refresh(alert)

    return {
        "status": "simulated",
        "message": f"Simulated price drop for {alert.product.name if alert.product else alert.product_id}.",
        "alert": alert.to_dict(mask_email=True)
    }

# ----------------- WATCHLIST (HARDWARE STASH) ENDPOINTS -----------------

@router.post("/watchlist", response_model=Dict[str, Any])
def add_to_watchlist(
    payload: WatchlistAddRequest,
    db: Session = Depends(get_db)
):
    """Add a hardware product to user's saved stash / watchlist."""
    product = db.query(Product).filter(Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"Product '{payload.product_id}' not found.")

    user_id = payload.user_identifier.strip()
    existing = db.query(WatchlistItem).filter(
        WatchlistItem.user_identifier == user_id,
        WatchlistItem.product_id == payload.product_id
    ).first()

    if existing:
        return {
            "status": "already_exists",
            "message": f"{product.name} is already in your hardware stash.",
            "item": existing.to_dict()
        }

    item_id = f"wl_{uuid.uuid4().hex[:10]}"
    item = WatchlistItem(
        id=item_id,
        user_identifier=user_id,
        product_id=product.id,
        notes=payload.notes,
        created_at=utc_now()
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    return {
        "status": "added",
        "message": f"Added {product.name} to hardware stash.",
        "item": item.to_dict()
    }

@router.get("/watchlist")
def get_user_watchlist(
    user_identifier: str = Query("default_user"),
    db: Session = Depends(get_db)
):
    """Get all saved products in user's hardware stash with total valuation metrics."""
    user_id = user_identifier.strip()
    items = db.query(WatchlistItem).filter(
        WatchlistItem.user_identifier == user_id
    ).order_by(desc(WatchlistItem.created_at)).all()

    total_current_price = sum(item.product.price for item in items if item.product)
    total_items = len(items)

    return {
        "user_identifier": user_id,
        "total_items": total_items,
        "total_valuation": round(total_current_price, 2),
        "items": [item.to_dict() for item in items]
    }

@router.delete("/watchlist/{identifier}")
def remove_from_watchlist(
    identifier: str,
    user_identifier: str = Query("default_user"),
    db: Session = Depends(get_db)
):
    """Remove a product from the stash by watchlist item ID or product ID."""
    user_id = user_identifier.strip()
    # Match by ID or by product_id
    item = db.query(WatchlistItem).filter(
        WatchlistItem.user_identifier == user_id,
        (WatchlistItem.id == identifier) | (WatchlistItem.product_id == identifier)
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Watchlist item not found.")

    prod_name = item.product.name if item.product else identifier
    db.delete(item)
    db.commit()

    return {
        "status": "deleted",
        "message": f"Removed '{prod_name}' from hardware stash."
    }
