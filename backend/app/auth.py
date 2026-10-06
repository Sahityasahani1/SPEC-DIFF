"""Admin Authentication and RBAC Security Module."""
import hmac
from typing import Optional
from fastapi import Header, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import ADMIN_API_KEY

security_bearer = HTTPBearer(auto_error=False)

async def verify_admin_key(
    x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key"),
    bearer_credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer)
) -> str:
    """
    Validates admin identity via either:
    1. 'X-Admin-Key' HTTP Header
    2. 'Authorization: Bearer <token>' Header

    Uses hmac.compare_digest to prevent side-channel timing attacks.
    Raises 401 Unauthorized on authentication failure.
    """
    token_candidate: Optional[str] = None

    if x_admin_key:
        token_candidate = x_admin_key.strip()
    elif bearer_credentials and bearer_credentials.credentials:
        token_candidate = bearer_credentials.credentials.strip()

    if not token_candidate:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Admin credentials missing. Provide 'X-Admin-Key' or 'Authorization: Bearer <key>'."
        )

    expected_key = ADMIN_API_KEY.strip()
    # Constant-time comparison
    if not hmac.compare_digest(token_candidate.encode("utf-8"), expected_key.encode("utf-8")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Invalid admin API key."
        )

    return token_candidate
