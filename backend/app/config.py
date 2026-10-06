"""Application Configuration."""
import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DEFAULT_CSV_PATH = DATA_DIR / "laptops_india_catalog.csv"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/smartpick.db")
PROJECT_NAME = "SpecDiff - AI Laptop Recommendation Engine (India)"

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

# Optional LLM configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# Security & Auth
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "specdiff_admin_secret_key_2026")

# CORS Allowed Origins
raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000")
ALLOWED_ORIGINS = [o.strip() for o in raw_origins.split(",") if o.strip()]

# Redis Cache Config
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", "3600"))

# Rate Limiting
RATE_LIMIT_RECOMMEND = os.getenv("RATE_LIMIT_RECOMMEND", "15/minute")

def get_async_database_url(url: str) -> str:
    """Converts standard DB URL into async dialect URL."""
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("sqlite:///"):
        return url.replace("sqlite:///", "sqlite+aiosqlite:///", 1)
    return url

ASYNC_DATABASE_URL = get_async_database_url(DATABASE_URL)

