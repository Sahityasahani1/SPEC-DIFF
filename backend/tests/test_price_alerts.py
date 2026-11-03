"""Comprehensive Unit & Integration Tests for Price Drop Alerts and Hardware Watchlist."""
import pytest
from starlette.requests import Request
from fastapi import HTTPException
from app.database import SessionLocal
from app.models import Product, PriceAlert, WatchlistItem
from app.schemas import PriceAlertCreate, WatchlistAddRequest
from app.routers.alerts import (
    create_price_alert,
    list_price_alerts,
    delete_price_alert,
    get_triggered_notifications,
    simulate_price_drop_trigger,
    add_to_watchlist,
    get_user_watchlist,
    remove_from_watchlist
)

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def real_request():
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/api/alerts",
        "headers": [],
        "client": ("127.0.0.1", 50000)
    }
    return Request(scope)

def test_create_price_alert_success(db_session, real_request):
    product = db_session.query(Product).first()
    assert product is not None, "Product must exist in catalog"

    target = round(product.price * 0.90, 2)
    payload = PriceAlertCreate(
        product_id=product.id,
        user_email="buyer@specdiff.local",
        target_price=target
    )

    result = create_price_alert(real_request, payload, db_session)
    assert result["status"] in ("created", "updated")
    alert = result["alert"]
    assert alert["product_id"] == product.id
    assert alert["target_price"] == target
    assert alert["user_email"] == "buyer@specdiff.local"
    assert alert["is_triggered"] is False
    assert alert["potential_savings"] > 0

    # Clean up
    delete_price_alert(alert["id"], db_session)

def test_create_price_alert_target_higher_than_price_raises_400(db_session, real_request):
    product = db_session.query(Product).first()
    assert product is not None

    invalid_target = product.price + 5000.0
    payload = PriceAlertCreate(
        product_id=product.id,
        user_email="buyer@specdiff.local",
        target_price=invalid_target
    )

    with pytest.raises(HTTPException) as exc_info:
        create_price_alert(real_request, payload, db_session)
    assert exc_info.value.status_code == 400
    assert "must be lower than the current price" in exc_info.value.detail

def test_create_price_alert_invalid_email_raises_400(db_session, real_request):
    product = db_session.query(Product).first()
    assert product is not None

    payload = PriceAlertCreate(
        product_id=product.id,
        user_email="invalid-email-address",
        target_price=product.price * 0.8
    )

    with pytest.raises(HTTPException) as exc_info:
        create_price_alert(real_request, payload, db_session)
    assert exc_info.value.status_code == 400
    assert "Invalid email address format" in exc_info.value.detail

def test_list_and_delete_alerts(db_session, real_request):
    product = db_session.query(Product).first()
    target = round(product.price * 0.85, 2)
    email = "list_test@specdiff.local"

    payload = PriceAlertCreate(
        product_id=product.id,
        user_email=email,
        target_price=target
    )
    res = create_price_alert(real_request, payload, db_session)
    alert_id = res["alert"]["id"]

    # List alerts filtered by email
    alerts = list_price_alerts(email=email, db=db_session)
    assert len(alerts) >= 1
    assert any(a["id"] == alert_id for a in alerts)

    # Delete alert
    del_res = delete_price_alert(alert_id, db_session)
    assert del_res["status"] == "success"

    # Verify deleted
    alerts_after = list_price_alerts(email=email, db=db_session)
    assert not any(a["id"] == alert_id for a in alerts_after)

def test_simulate_price_drop_trigger_and_notification(db_session, real_request):
    product = db_session.query(Product).first()
    target = round(product.price * 0.88, 2)
    email = "simulate_test@specdiff.local"

    payload = PriceAlertCreate(
        product_id=product.id,
        user_email=email,
        target_price=target
    )
    res = create_price_alert(real_request, payload, db_session)
    alert_id = res["alert"]["id"]

    # Simulate trigger
    sim_res = simulate_price_drop_trigger(alert_id, db_session)
    assert sim_res["status"] == "simulated"
    assert sim_res["alert"]["is_triggered"] is True
    assert sim_res["alert"]["triggered_price"] is not None

    # Verify presence in notifications
    notif_data = get_triggered_notifications(10, db_session)
    assert notif_data["count"] >= 1
    assert any(n["id"] == alert_id for n in notif_data["notifications"])

    # Clean up
    delete_price_alert(alert_id, db_session)

def test_watchlist_lifecycle(db_session):
    product = db_session.query(Product).first()
    assert product is not None
    user_id = "test_user_hardware_stash"

    # 1. Add to stash
    add_payload = WatchlistAddRequest(
        product_id=product.id,
        user_identifier=user_id,
        notes="High-priority development laptop"
    )
    add_res = add_to_watchlist(add_payload, db_session)
    assert add_res["status"] in ("added", "already_exists")
    assert add_res["item"]["product_id"] == product.id

    # 2. Add duplicate (idempotent check)
    dup_res = add_to_watchlist(add_payload, db_session)
    assert dup_res["status"] == "already_exists"

    # 3. Retrieve user watchlist
    wl_data = get_user_watchlist(user_identifier=user_id, db=db_session)
    assert wl_data["total_items"] >= 1
    assert wl_data["total_valuation"] > 0
    assert any(i["product_id"] == product.id for i in wl_data["items"])

    # 4. Remove from stash
    del_res = remove_from_watchlist(product.id, user_identifier=user_id, db=db_session)
    assert del_res["status"] == "deleted"

    # 5. Verify removal
    wl_after = get_user_watchlist(user_identifier=user_id, db=db_session)
    assert not any(i["product_id"] == product.id for i in wl_after["items"])


def test_market_sync_triggers_price_alerts(db_session, real_request):
    from app.services.market_price_service import sync_catalog_market_prices
    
    product = db_session.query(Product).first()
    assert product is not None
    orig_price = product.price

    # Set up alert for 5% below current price
    target = round(orig_price * 0.95, 2)
    alert_payload = PriceAlertCreate(
        product_id=product.id,
        user_email="auto_trigger@specdiff.local",
        target_price=target
    )
    res = create_price_alert(real_request, alert_payload, db_session)
    alert_id = res["alert"]["id"]

    # Temporarily set product price below target to trigger
    product.price = round(target * 0.85, 2)
    db_session.commit()

    # Run market price sync
    sync_res = sync_catalog_market_prices(db_session)
    assert sync_res["status"] == "success"
    assert sync_res["triggered_alerts"] >= 1

    # Verify alert state
    alert = db_session.query(PriceAlert).filter(PriceAlert.id == alert_id).first()
    assert alert.is_triggered is True
    assert alert.triggered_price is not None
    assert alert.triggered_at is not None

    # Clean up
    product.price = orig_price
    delete_price_alert(alert_id, db_session)
