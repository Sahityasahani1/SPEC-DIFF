"""Affiliate Outbound Click Tracking Router."""
import datetime
import logging
from fastapi import APIRouter, Request
from app.schemas import ClickTrackRequest

logger = logging.getLogger("specdiff.affiliate")

router = APIRouter(prefix="/api/track", tags=["Affiliate Tracking"])

@router.post("/click")
def track_outbound_click(payload: ClickTrackRequest, request: Request):
    """
    Logs affiliate click telemetry before user redirects to e-commerce retailer.
    Captures product ID, retail partner, destination URL, and client headers.
    """
    client_ip = request.client.host if request.client else "unknown"
    user_agent = payload.user_agent or request.headers.get("user-agent", "unknown")
    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()

    logger.info(
        f"[AFFILIATE_CLICK] ts={timestamp} ip={client_ip} sku={payload.product_id} "
        f"retailer='{payload.retail_source}' url='{payload.target_url}'"
    )

    return {
        "status": "recorded",
        "product_id": payload.product_id,
        "retail_source": payload.retail_source,
        "redirect_url": payload.target_url,
        "timestamp": timestamp
    }
