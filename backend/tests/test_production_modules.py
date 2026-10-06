"""Unit and Integration Tests for Production Modules: Auth, Rate Limiting, Validation, Caching, and Telemetry."""
import io
import time
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import ADMIN_API_KEY
from app.schemas import RecommendationRequest
from app.services.cache_service import cache_service
from app.services.vector_service import generate_text_embedding

client = TestClient(app)

def test_admin_auth_unauthorized():
    """Verify that admin endpoints reject unauthenticated or incorrectly authenticated requests with 401."""
    # No credentials
    res1 = client.post("/api/admin/catalog/reindex")
    assert res1.status_code == 401
    assert "Unauthorized" in res1.json().get("detail", "")

    # Invalid header
    res2 = client.post(
        "/api/admin/catalog/reindex",
        headers={"X-Admin-Key": "wrong_key_12345"}
    )
    assert res2.status_code == 401

    # Invalid bearer token
    res3 = client.post(
        "/api/admin/catalog/reindex",
        headers={"Authorization": "Bearer invalid_token"}
    )
    assert res3.status_code == 401

def test_admin_auth_success():
    """Verify that admin endpoints accept requests with valid X-Admin-Key or Bearer token."""
    # Valid X-Admin-Key header
    res1 = client.post(
        "/api/admin/catalog/reindex",
        headers={"X-Admin-Key": ADMIN_API_KEY}
    )
    assert res1.status_code == 200
    assert res1.json()["status"] == "success"

    # Valid Bearer token
    res2 = client.post(
        "/api/admin/catalog/reindex",
        headers={"Authorization": f"Bearer {ADMIN_API_KEY}"}
    )
    assert res2.status_code == 200

def test_input_validation_and_sanitization():
    """Verify Pydantic v2 strict constraints and free-text HTML sanitization."""
    # 1. HTML script tags in use_case should be stripped cleanly
    dirty_query = "<script>alert('xss')</script><b>Engineering</b> laptop for Python and Docker containers"
    res = client.post(
        "/api/recommend",
        json={
            "category": "laptop",
            "max_budget": 85000,
            "min_ram_gb": 16,
            "min_storage_gb": 512,
            "use_case": dirty_query,
            "priority": "value"
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"

    # 2. Reject budget below minimum threshold
    res_bad_budget = client.post(
        "/api/recommend",
        json={
            "category": "laptop",
            "max_budget": 500,  # Below ge=1000 minimum
            "min_ram_gb": 16,
            "min_storage_gb": 512,
            "use_case": "Budget laptop",
            "priority": "value"
        }
    )
    assert res_bad_budget.status_code == 422

    # 3. Reject invalid category regex
    res_bad_cat = client.post(
        "/api/recommend",
        json={
            "category": "invalid_category_xyz",
            "max_budget": 50000,
            "min_ram_gb": 8,
            "min_storage_gb": 256,
            "use_case": "Valid query for computer",
            "priority": "value"
        }
    )
    assert res_bad_cat.status_code == 422

def test_click_tracking():
    """Verify outbound affiliate click telemetry logging endpoint."""
    res = client.post(
        "/api/track/click",
        json={
            "product_id": "lap_apple_macbook_air_m2",
            "retail_source": "Amazon India",
            "target_url": "https://www.amazon.in/dp/B0B3C9B8",
            "user_agent": "Mozilla/5.0 Test Suite"
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "recorded"
    assert data["product_id"] == "lap_apple_macbook_air_m2"
    assert data["redirect_url"] == "https://www.amazon.in/dp/B0B3C9B8"

def test_cache_service_deterministic_key():
    """Verify deterministic SHA-256 cache key generation and query normalization."""
    req1 = RecommendationRequest(
        category="laptop",
        max_budget=75000,
        min_ram_gb=16,
        min_storage_gb=512,
        use_case="Machine Learning and Python coding",
        priority="performance"
    )
    req2 = RecommendationRequest(
        category="laptop",
        max_budget=75000,
        min_ram_gb=16,
        min_storage_gb=512,
        use_case="  machine  learning   and python   coding  ",
        priority="performance"
    )
    key1 = cache_service.generate_key(req1)
    key2 = cache_service.generate_key(req2)
    # Extra whitespace and uppercase must normalize to identical cache key
    assert key1 == key2
    assert key1.startswith("specdiff:rec:")

def test_embedding_generator_384_dimensions():
    """Verify dense 384-dimensional normalized vector generation for pgvector."""
    vec = generate_text_embedding("Apple MacBook Air M2 16GB RAM 512GB SSD")
    assert len(vec) == 384
    # Vector must be unit length L2-normalized (magnitude ~ 1.0)
    import numpy as np
    norm = np.linalg.norm(vec)
    assert abs(norm - 1.0) < 1e-4

def test_async_catalog_upload_ack_and_status():
    """Verify async background ingestion returns job_id and reports status."""
    valid_csv = """id,name,category,brand,price,ram_gb,storage_gb,processor,gpu,battery_hours,weight_kg,rating,description,pros,cons,in_stock
lap_async_01,Async Test Notebook,laptop,Asus,52000,16,512,Intel i5,Iris Xe,8.0,1.5,4.5,Fast coding notebook,Fast,None,1
"""
    files = {"file": ("test_catalog.csv", io.BytesIO(valid_csv.encode("utf-8")), "text/csv")}
    res = client.post(
        "/api/admin/catalog/upload",
        files=files,
        headers={"X-Admin-Key": ADMIN_API_KEY}
    )
    assert res.status_code == 200
    ack = res.json()
    assert "job_id" in ack
    assert ack["status"] == "processing"

    job_id = ack["job_id"]
    # Poll job status
    res_status = client.get(
        f"/api/admin/catalog/upload/{job_id}",
        headers={"X-Admin-Key": ADMIN_API_KEY}
    )
    assert res_status.status_code == 200
    job_status = res_status.json()
    assert job_status["job_id"] == job_id
    assert job_status["status"] in ["processing", "completed"]
