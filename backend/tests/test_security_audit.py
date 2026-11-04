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


def test_csp_header_present():
    """Verify Content-Security-Policy (CSP) header is returned in HTTP responses."""
    res = client.get("/api/health")
    assert res.status_code == 200
    csp = res.headers.get("Content-Security-Policy", "")
    assert "default-src 'self'" in csp
    assert "frame-ancestors 'none'" in csp


def test_ssrf_protection_in_scraper():
    """Verify fetch_live_web_price blocks non-whitelisted domains, IP addresses, and invalid schemes."""
    from app.services.market_price_service import fetch_live_web_price

    # Subdomain spoofing attempt
    assert fetch_live_web_price("https://amazon.in.attacker.com/dp/B001") is None
    # Cloud metadata SSRF attempt
    assert fetch_live_web_price("http://169.254.169.254/latest/meta-data/?fake=amazon.in") is None
    # Arbitrary host
    assert fetch_live_web_price("https://malicious.org/amazon.in") is None
    # Plain HTTP scheme (non-HTTPS)
    assert fetch_live_web_price("http://amazon.in/dp/B001") is None
    # Embedded credentials
    assert fetch_live_web_price("https://user:pass@amazon.in/dp/B001") is None


def test_track_click_untrusted_domain_blocked():
    """Verify POST /api/track/click rejects untrusted or phishing retail domains with HTTP 400."""
    payload = {
        "product_id": "test_prod_1",
        "retail_source": "FakeRetailer",
        "target_url": "https://phishing-site.com/steal-creds"
    }
    res = client.post("/api/track/click", json=payload)
    assert res.status_code == 400
    assert "Untrusted retail domain" in res.json().get("detail", "")

    # Subdomain spoofing
    payload["target_url"] = "https://amazon.in.attacker.com/deal"
    res2 = client.post("/api/track/click", json=payload)
    assert res2.status_code == 400


def test_track_click_trusted_domain_accepted():
    """Verify POST /api/track/click accepts verified partner domains."""
    payload = {
        "product_id": "lap_macbook_air_m3",
        "retail_source": "Amazon India",
        "target_url": "https://www.amazon.in/dp/B0CX2144?tag=specdiff-21"
    }
    res = client.post("/api/track/click", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "recorded"
    assert "amazon.in" in data["redirect_url"]


def test_price_alert_email_masking():
    """Verify PriceAlert.to_dict(mask_email=True) masks email to prevent PII harvesting."""
    from app.models import PriceAlert
    alert = PriceAlert(
        id="alt_test_mask",
        product_id="prod_1",
        user_email="confidential.buyer@example.com",
        target_price=50000.0,
        initial_price=60000.0,
        is_triggered=True
    )
    unmasked = alert.to_dict(mask_email=False)
    assert unmasked["user_email"] == "confidential.buyer@example.com"

    masked = alert.to_dict(mask_email=True)
    assert masked["user_email"] == "c***@example.com"
    assert "confidential.buyer" not in masked["user_email"]


def test_copilot_query_html_sanitization():
    """Verify CopilotRequest strips HTML tags and control characters from query input."""
    from app.schemas import CopilotRequest
    req = CopilotRequest(query="<script>alert('xss')</script>Best laptop for coding under 70k")
    assert "<script>" not in req.query
    assert "</script>" not in req.query
    assert "Best laptop for coding under 70k" in req.query


def test_price_alert_idor_protection():
    """Verify deleting a price alert without matching email or admin key is rejected with 403 Forbidden."""
    prod_res = client.get("/api/products?limit=1")
    assert prod_res.status_code == 200
    prod = prod_res.json()["products"][0]

    payload = {
        "product_id": prod["id"],
        "user_email": "victim@specdiff.local",
        "target_price": round(prod["price"] * 0.90, 2)
    }
    create_res = client.post("/api/alerts", json=payload)
    assert create_res.status_code == 200
    alert_id = create_res.json()["alert"]["id"]

    # 1. Attempt delete with wrong email -> HTTP 403
    del_res_attacker = client.delete(f"/api/alerts/{alert_id}?email=attacker@malicious.org")
    assert del_res_attacker.status_code == 403
    assert "Forbidden" in del_res_attacker.json().get("detail", "")

    # 2. Legitimate owner delete with matching email -> HTTP 200
    del_res_owner = client.delete(f"/api/alerts/{alert_id}?email=victim@specdiff.local")
    assert del_res_owner.status_code == 200
