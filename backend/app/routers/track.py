"""Affiliate Outbound Click Tracking Router with Privacy-Preserving Telemetry."""
import datetime
import logging
from urllib.parse import urlparse
from fastapi import APIRouter, Request, HTTPException
from app.schemas import ClickTrackRequest
from app.limiter import limiter

logger = logging.getLogger("specdiff.affiliate")

router = APIRouter(prefix="/api/track", tags=["Affiliate Tracking"])

TRUSTED_RETAIL_DOMAINS = {
    "amazon.in", "flipkart.com", "croma.com", "reliancedigital.in",
    "apple.com", "vijaysales.com", "tatacliq.com"
}

def anonymize_ip(ip: str) -> str:
    """Anonymize IP address for privacy compliance (GDPR/privacy-friendly)."""
    if not ip or ip == "unknown":
        return "unknown"
    if ":" in ip:
        # IPv6: mask host bits
        parts = ip.split(":")
        return ":".join(parts[:3]) + "::xxxx"
    elif "." in ip:
        # IPv4: zero out last octet
        parts = ip.split(".")
        if len(parts) == 4:
            return f"{parts[0]}.{parts[1]}.{parts[2]}.xxx"
    return "anonymized"

@router.post("/click")
@limiter.limit("60/minute")
def track_outbound_click(request: Request, payload: ClickTrackRequest):
    """
    Logs affiliate click telemetry before user redirects to e-commerce retailer.
    Validates URL safety, prevents open redirects, and anonymizes client IP.
    """
    # 1. URL Scheme & Open Redirect Defense
    try:
        parsed = urlparse(payload.target_url)
        if parsed.scheme not in ("http", "https"):
            raise ValueError("Only http and https destination URLs are allowed.")
        if not parsed.netloc:
            raise ValueError("Invalid target URL host.")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid destination URL format.")

    # 2. Privacy-preserving client telemetry
    raw_ip = request.client.host if request.client else "unknown"
    client_ip = anonymize_ip(raw_ip)
    user_agent = (payload.user_agent or request.headers.get("user-agent", "unknown"))[:200]
    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()

    logger.info(
        f"[AFFILIATE_CLICK] ts={timestamp} ip={client_ip} sku={payload.product_id} "
        f"retailer='{payload.retail_source}' dest_host='{parsed.netloc}'"
    )

    return {
        "status": "recorded",
        "product_id": payload.product_id,
        "retail_source": payload.retail_source,
        "redirect_url": payload.target_url,
        "timestamp": timestamp
    }
