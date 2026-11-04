"""Application Configuration and Validated Environment Settings."""
import os
import sys
import logging
from pathlib import Path
from typing import List, Literal
from pydantic import BaseModel, Field, field_validator
from pydantic_core import PydanticCustomError

logger = logging.getLogger("specdiff.config")

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
if not DATA_DIR.exists() and (BASE_DIR / "backend" / "data").exists():
    DATA_DIR = BASE_DIR / "backend" / "data"
DEFAULT_CSV_PATH = DATA_DIR / "laptops_india_catalog.csv"
PROJECT_NAME = "SpecDiff - AI Hardware Intelligence Platform (India)"

INSECURE_DEFAULT_KEY = "specdiff_admin_secret_key_2026"

class ScoringWeights(BaseModel):
    w_req: float = 0.35      # Requirement match
    w_sem: float = 0.25      # Semantic relevance
    w_prio: float = 0.20     # User priority alignment
    w_rat: float = 0.10      # Customer rating
    w_val: float = 0.10      # Value for money (spec/price)

DEFAULT_WEIGHTS = ScoringWeights()

# Indian market price tiers (in INR ₹)
INDIAN_PRICE_TIERS = {
    "tier_1_budget": {"min": 25000, "max": 42000, "label": "Budget & School (Under ₹42k)"},
    "tier_2_college": {"min": 42000, "max": 65000, "label": "College Coding & Mainstream (₹42k - ₹65k)"},
    "tier_3_gaming": {"min": 60000, "max": 85000, "label": "Budget/Mid Gaming & Creator (₹60k - ₹85k)"},
    "tier_4_premium": {"min": 80000, "max": 125000, "label": "Premium Thin & Light (₹80k - ₹1.25L)"},
    "tier_5_flagship": {"min": 125000, "max": 250000, "label": "Flagship Workstation (Above ₹1.25L)"},
}

# Supported Priorities
VALID_PRIORITIES = ["value", "performance", "battery", "portability", "price"]

def get_async_database_url(url: str) -> str:
    """Converts standard DB URL into async dialect URL."""
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("sqlite:///"):
        return url.replace("sqlite:///", "sqlite+aiosqlite:///", 1)
    return url

class AppEnvironmentSettings(BaseModel):
    """Pydantic validated environment configuration schema."""
    environment: Literal["development", "staging", "production", "test"] = Field(
        default="development",
        description="Deployment target environment"
    )
    database_url: str = Field(
        default=f"sqlite:///{BASE_DIR}/smartpick.db",
        description="Database connection URL"
    )
    admin_api_key: str = Field(
        default=INSECURE_DEFAULT_KEY,
        description="API Key for administrative endpoints"
    )
    allowed_origins_raw: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000,http://localhost,https://spec-diff-gamma.vercel.app",
        description="Comma-delimited CORS allowed origins"
    )
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL for caching"
    )
    cache_ttl_seconds: int = Field(
        default=3600,
        ge=60,
        le=86400 * 7,
        description="Cache TTL in seconds"
    )
    rate_limit_recommend: str = Field(
        default="15/minute",
        description="Rate limit rule for recommendations"
    )
    rate_limit_copilot: str = Field(
        default="20/minute",
        description="Rate limit rule for AI copilot queries"
    )
    gemini_api_key: str = Field(
        default="",
        description="Google Gemini API Key"
    )
    openai_api_key: str = Field(
        default="",
        description="OpenAI API Key"
    )
    keepa_api_key: str = Field(
        default="",
        description="Keepa Real-Time Amazon India Price API Key"
    )
    rainforest_api_key: str = Field(
        default="",
        description="Rainforest E-Commerce Live Pricing API Key"
    )
    sentry_dsn: str = Field(
        default="",
        description="Optional Sentry DSN for production error monitoring"
    )

    @field_validator("admin_api_key")
    @classmethod
    def validate_admin_key(cls, v: str, info) -> str:
        env = (info.data.get("environment") if hasattr(info, "data") and "environment" in info.data else os.getenv("ENVIRONMENT", "development")).lower()
        if env == "production":
            if not v or v.strip() == INSECURE_DEFAULT_KEY:
                import secrets
                auto_key = f"specdiff_prod_key_{secrets.token_hex(20)}"
                logger.warning("Production ADMIN_API_KEY not configured. Auto-generated ephemeral admin key.")
                return auto_key
            if len(v.strip()) < 16:
                import secrets
                return f"{v.strip()}_{secrets.token_hex(8)}"
        return v.strip() if v else INSECURE_DEFAULT_KEY

    @property
    def allowed_origins(self) -> List[str]:
        return [o.strip() for o in self.allowed_origins_raw.split(",") if o.strip()]

# Load and validate settings from OS environment
_env_str = os.getenv("ENVIRONMENT", "development").lower()
_default_admin_key = (
    f"specdiff_prod_secure_fallback_{os.urandom(12).hex()}"
    if _env_str == "production"
    else INSECURE_DEFAULT_KEY
)

_raw_settings = {
    "environment": _env_str,
    "database_url": os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/smartpick.db"),
    "admin_api_key": os.getenv("ADMIN_API_KEY") or _default_admin_key,
    "allowed_origins_raw": os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000,http://localhost,https://spec-diff-gamma.vercel.app"
    ),
    "redis_url": os.getenv("REDIS_URL", "redis://localhost:6379/0"),
    "cache_ttl_seconds": int(os.getenv("CACHE_TTL_SECONDS", "3600")),
    "rate_limit_recommend": os.getenv("RATE_LIMIT_RECOMMEND", "15/minute"),
    "rate_limit_copilot": os.getenv("RATE_LIMIT_COPILOT", "20/minute"),
    "gemini_api_key": os.getenv("GEMINI_API_KEY", "").strip(),
    "openai_api_key": os.getenv("OPENAI_API_KEY", "").strip(),
    "keepa_api_key": os.getenv("KEEPA_API_KEY", "").strip(),
    "rainforest_api_key": os.getenv("RAINFOREST_API_KEY", "").strip(),
    "sentry_dsn": os.getenv("SENTRY_DSN", "").strip()
}

try:
    settings = AppEnvironmentSettings(**_raw_settings)
except Exception as err:
    logger.critical(f"FATAL: Application configuration validation failed: {err}")
    # Fail fast if invalid configuration provided
    raise SystemExit(f"Configuration Error: {err}")

# Backward-compatible global exports
ENVIRONMENT = settings.environment
DATABASE_URL = settings.database_url
ASYNC_DATABASE_URL = get_async_database_url(DATABASE_URL)
ADMIN_API_KEY = settings.admin_api_key
ALLOWED_ORIGINS = settings.allowed_origins
REDIS_URL = settings.redis_url
CACHE_TTL_SECONDS = settings.cache_ttl_seconds
RATE_LIMIT_RECOMMEND = settings.rate_limit_recommend
RATE_LIMIT_COPILOT = settings.rate_limit_copilot
GEMINI_API_KEY = settings.gemini_api_key
OPENAI_API_KEY = settings.openai_api_key
SENTRY_DSN = settings.sentry_dsn
