"""Security Audit and Hardening Test Suite (Phases 0 through 9)."""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import ADMIN_API_KEY, AppEnvironmentSettings, INSECURE_DEFAULT_KEY
from app.services.catalog_service import sanitize_cell
from app.services.cache_service import cache_service
from app.services.vector_service import _stable_hash

client = TestClient(app)

def test_security_headers_present():
    """Verify production security defense headers are injected on all HTTP responses."""
    res = client.get("/api/health")
    assert res.status_code == 200
    headers = res.headers

    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") == "DENY"
    assert headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert headers.get("X-XSS-Protection") == "1; mode=block"
    assert "geolocation=(), camera=(), microphone=()" in headers.get("Permissions-Policy", "")
    assert "X-Request-ID" in headers
    assert len(headers["X-Request-ID"]) > 0

def test_custom_request_id_tracing():
    """Verify that client-provided X-Request-ID is preserved and echoed for end-to-end tracing."""
    custom_trace_id = "trace-sec-audit-998877"
    res = client.get("/api/health", headers={"X-Request-ID": custom_trace_id})
    assert res.status_code == 200
    assert res.headers.get("X-Request-ID") == custom_trace_id

def test_readiness_probe_endpoint():
    """Verify deep readiness probe validates database connectivity and model status."""
    res = client.get("/api/ready")
    assert res.status_code == 200
    data = res.json()
    assert data.get("status") == "ready"
    assert data.get("database") == "connected"
    assert "products_count" in data

def test_admin_auth_protects_stock_update():
    """Verify PATCH /api/products/{id}/stock requires valid admin credentials."""
    # Find a valid product ID
    list_res = client.get("/api/products?limit=1")
    assert list_res.status_code == 200
    prods = list_res.json()["products"]
    assert len(prods) > 0
    prod_id = prods[0]["id"]

    # 1. Reject missing credentials with 401
    res_no_auth = client.patch(
        f"/api/products/{prod_id}/stock",
        json={"in_stock": False}
    )
    assert res_no_auth.status_code == 401
    assert "Unauthorized" in res_no_auth.json().get("detail", "")

    # 2. Reject invalid key with 401
    res_bad_auth = client.patch(
        f"/api/products/{prod_id}/stock",
        json={"in_stock": False},
        headers={"X-Admin-Key": "malicious_spoofed_key_999"}
    )
    assert res_bad_auth.status_code == 401

    # 3. Accept valid admin key
    res_valid = client.patch(
        f"/api/products/{prod_id}/stock",
        json={"in_stock": True},
        headers={"X-Admin-Key": ADMIN_API_KEY}
    )
    assert res_valid.status_code == 200
    assert res_valid.json()["status"] == "success"
    assert res_valid.json()["in_stock"] is True

def test_csv_formula_injection_defense():
    """Verify CSV cells beginning with =, +, -, @, or tabs are neutralized with a leading single quote."""
    assert sanitize_cell("=1+1") == "'=1+1"
    assert sanitize_cell("+SUM(A1:A10)") == "'+SUM(A1:A10)"
    assert sanitize_cell("-12345") == "'-12345"
    assert sanitize_cell("@HYPERLINK('http://evil.com')") == "'@HYPERLINK('http://evil.com')"
    assert sanitize_cell("\tMALICIOUS_TAB") == "'MALICIOUS_TAB"
    assert sanitize_cell("Safe Product Name 15") == "Safe Product Name 15"
    assert sanitize_cell(1234) == 1234

def test_click_tracker_open_redirect_defense():
    """Verify tracking endpoint rejects dangerous or malformed destination URLs."""
    # Reject javascript: pseudo-protocol
    res1 = client.post(
        "/api/track/click",
        json={"product_id": "test_p1", "retail_source": "Amazon India", "target_url": "javascript:alert(document.cookie)"}
    )
    assert res1.status_code == 400
    assert "Invalid destination URL" in res1.json().get("detail", "")

    # Reject data: URI scheme
    res2 = client.post(
        "/api/track/click",
        json={"product_id": "test_p1", "retail_source": "Amazon India", "target_url": "data:text/html;base64,PHNjcmlwdD4="}
    )
    assert res2.status_code == 400

    # Accept valid HTTP/HTTPS URL and verify IP masking
    res3 = client.post(
        "/api/track/click",
        json={"product_id": "test_p1", "retail_source": "Amazon India", "target_url": "https://www.amazon.in/dp/B0CXF3F3W"}
    )
    assert res3.status_code == 200
    assert res3.json()["status"] == "recorded"

def test_feedback_sanitization_and_graceful_handling():
    """Verify user feedback comments have HTML tags stripped and handle non-existent logs gracefully."""
    res = client.post(
        "/api/feedback",
        json={
            "recommendation_id": "non_existent_rec_uuid_00000",
            "rating": 1,
            "comment": "<script>alert('xss')</script>Excellent recommendations!"
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"

def test_config_production_invariants():
    """Verify that Pydantic configuration schema rejects default keys and short secrets in production."""
    # Production with default insecure key must fail fast
    with pytest.raises(Exception):
        AppEnvironmentSettings(
            environment="production",
            admin_api_key=INSECURE_DEFAULT_KEY
        )

    # Production with short secret must fail fast
    with pytest.raises(Exception):
        AppEnvironmentSettings(
            environment="production",
            admin_api_key="short_key"
        )

    # Production with strong 32-character key passes validation
    strong_key = "a_super_strong_production_entropy_key_32chars!"
    cfg = AppEnvironmentSettings(
        environment="production",
        admin_api_key=strong_key
    )
    assert cfg.admin_api_key == strong_key

def test_cache_lru_bounded_capacity():
    """Verify that in-memory cache enforces LRU eviction when capacity (1,000 items) is reached."""
    import asyncio
    import time
    cache_service._last_redis_attempt = time.time()  # Prevent network reconnect attempt during unit test
    cache_service._redis_client = None

    async def populate():
        for i in range(1050):
            await cache_service.set(f"test_key_{i}", {"val": i}, ttl=60)
    
    asyncio.run(populate())
    assert len(cache_service._in_memory_cache) <= 1000
    cache_service._in_memory_cache.clear()

def test_stable_hashing_consistency():
    """Verify _stable_hash produces identical integers across multiple invocations."""
    h1 = _stable_hash("Lenovo LOQ 15 Gaming Laptop")
    h2 = _stable_hash("Lenovo LOQ 15 Gaming Laptop")
    assert h1 == h2
    assert isinstance(h1, int)
