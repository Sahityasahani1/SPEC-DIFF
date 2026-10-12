"""Admin Authentication, RBAC, and Audit Security Module."""
import hmac
import logging
import datetime
from typing import Optional
from fastapi import Header, HTTPException, Security, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import ADMIN_API_KEY

logger = logging.getLogger("specdiff.auth")
security_bearer = HTTPBearer(auto_error=False)

async def verify_admin_key(
    request: Request,
    x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key"),
    bearer_credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer)
) -> str:
    """
    Validates admin identity via either:
    1. 'X-Admin-Key' HTTP Header
    2. 'Authorization: Bearer <token>' Header

    Uses hmac.compare_digest to prevent side-channel timing attacks.
    Logs all authorization attempts for security auditing.
    Raises 401 Unauthorized on authentication failure.
    """
    client_ip = request.client.host if request.client else "unknown"
    endpoint = request.url.path
    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()

    token_candidate: Optional[str] = None

    if x_admin_key:
        token_candidate = x_admin_key.strip()
    elif bearer_credentials and bearer_credentials.credentials:
        token_candidate = bearer_credentials.credentials.strip()

    if not token_candidate:
        logger.warning(f"[AUTH_FAILURE] Missing admin credentials: ip={client_ip} path={endpoint} ts={timestamp}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Admin credentials missing. Provide 'X-Admin-Key' or 'Authorization: Bearer <key>'."
        )

    expected_key = ADMIN_API_KEY.strip()
    # Constant-time comparison
    if not hmac.compare_digest(token_candidate.encode("utf-8"), expected_key.encode("utf-8")):
        logger.warning(f"[AUTH_FAILURE] Invalid admin credentials rejected: ip={client_ip} path={endpoint} ts={timestamp}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Invalid admin API key."
        )

    logger.info(f"[AUTH_SUCCESS] Admin action authorized: ip={client_ip} path={endpoint} ts={timestamp}")
    return token_candidate
