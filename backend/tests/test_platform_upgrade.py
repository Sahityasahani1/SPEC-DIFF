"""Unit tests for Platform Upgrade: Benchmarks, Price Tracker, and Copilot."""
import pytest
from app.database import SessionLocal
from app.models import Product
from app.services.benchmark_service import get_benchmarks
from app.services.price_tracker_service import get_price_signal
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_benchmark_service_laptops():
    db = SessionLocal()
    try:
        p = db.query(Product).filter(Product.category == "laptop").first()
        assert p is not None
        b = get_benchmarks(p)
        assert b["geekbench_single"] is not None
        assert b["geekbench_single"] > 1000
        assert b["geekbench_multi"] is not None
        assert b["geekbench_multi"] > 3000
        assert b["cinebench_r23_multi"] is not None
        assert b["battery_index"] is not None
        assert 0 <= b["battery_index"] <= 100
        assert b["thermal_stability"] is not None
        assert 0 <= b["thermal_stability"] <= 100
    finally:
        db.close()

def test_benchmark_service_wearables_return_none():
    db = SessionLocal()
    try:
        p = db.query(Product).filter(Product.category.in_(["audio", "smartwatch", "monitor"])).first()
        if p:
            b = get_benchmarks(p)
            assert b["geekbench_single"] is None
            assert b["gaming_fps"] is None
    finally:
        db.close()

def test_price_tracker_service():
    db = SessionLocal()
    try:
        p = db.query(Product).first()
        assert p is not None
        ps = get_price_signal(p)
        assert len(ps["price_history"]) == 30
        assert ps["current_price"] == p.price
        assert ps["all_time_low"] <= ps["current_price"] * 1.05
        assert ps["msrp"] >= ps["current_price"]
        assert ps["signal"] in ["STRONG_BUY", "FAIR_VALUE", "WAIT_FOR_SALE"]
        assert ps["estimated_savings"] >= 0
        assert len(ps["estimated_next_sale"]) > 0
    finally:
        db.close()

def test_copilot_endpoint_deterministic_fallback():
    response = client.post(
        "/api/copilot",
        json={
            "query": "Which laptop is best for coding under 80000 with long battery life?",
            "active_product_ids": [],
            "history": []
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert len(data["reply"]) > 0
    assert "suggested_prompts" in data
    assert len(data["suggested_prompts"]) > 0
    assert "relevant_products" in data
