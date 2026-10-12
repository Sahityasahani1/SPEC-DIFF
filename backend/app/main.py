"""Main FastAPI Application Entrypoint."""
import os
import sys
import uuid
import logging
import asyncio
import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

logger = logging.getLogger("specdiff.api")

from app.database import init_db, SessionLocal
from app.models import Product
from app.config import PROJECT_NAME, DEFAULT_CSV_PATH, ALLOWED_ORIGINS, ENVIRONMENT
from app.services.catalog_service import import_csv_catalog
from app.services.vector_service import semantic_engine
from app.limiter import limiter
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from app.routers.recommend import router as recommend_router
from app.routers.compare import router as compare_router
from app.routers.products import router as products_router
from app.routers.admin import router as admin_router
from app.routers.feedback import router as feedback_router
from app.routers.copilot import router as copilot_router
from app.routers.track import router as track_router

def _run_market_sync_task():
    try:
        from app.services.market_price_service import sync_catalog_market_prices
        db = SessionLocal()
        try:
            sync_catalog_market_prices(db)
            all_prods = db.query(Product).all()
            semantic_engine.index_products(all_prods)
        finally:
            db.close()
    except Exception as e:
        logger.error(f"[SCHEDULER] Market price sync failed: {e}")

async def daily_price_sync_worker():
    """Background worker that automatically updates product prices every day at Midnight IST (18:30 UTC)."""
    while True:
        try:
            now_utc = datetime.datetime.now(datetime.timezone.utc)
            # Midnight IST is 18:30 UTC
            target_time = now_utc.replace(hour=18, minute=30, second=0, microsecond=0)
            if now_utc >= target_time:
                target_time += datetime.timedelta(days=1)
            sleep_seconds = (target_time - now_utc).total_seconds()
            logger.info(f"[SCHEDULER] Next daily market price sync scheduled in {sleep_seconds/3600:.2f} hours (at 00:00 IST).")
            await asyncio.sleep(sleep_seconds)
            logger.info("[SCHEDULER] Executing daily market price sync...")
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, _run_market_sync_task)
            logger.info("[SCHEDULER] Daily market price sync finished successfully.")
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"[SCHEDULER] Error in daily price sync worker: {e}")
            await asyncio.sleep(300)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB and auto-seed if empty
    print("[INFO] Starting SmartPick Recommendation Engine...")
    init_db()
    db = SessionLocal()
    try:
        count = db.query(Product).count()
        if count == 0 and DEFAULT_CSV_PATH.exists():
            print(f"[INFO] Seeding initial Indian laptop catalog from {DEFAULT_CSV_PATH.name}...")
            with open(DEFAULT_CSV_PATH, "r", encoding="utf-8-sig") as f:
                import_csv_catalog(db, f.read())
            print("[SUCCESS] Catalog seeded successfully.")
        else:
            # Index existing products in semantic engine
            all_prods = db.query(Product).all()
            semantic_engine.index_products(all_prods)
            print(f"[SUCCESS] Semantic engine initialized with {len(all_prods)} products.")
    finally:
        db.close()
    
    # Launch daily automated market price synchronizer in background
    sync_task = asyncio.create_task(daily_price_sync_worker())
    yield
    sync_task.cancel()
    print("[INFO] Shutting down SmartPick Backend.")

app = FastAPI(
    title="SpecDiff - AI Hardware Intelligence Platform",
    description="Hybrid RAG Recommendation System with Deterministic Filtering, Multi-Factor Scoring, and Anti-Hallucination Explanations.",
    version="2.0.0",
    lifespan=lifespan
)

# Rate Limiter integration
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Global Exception Handler for Unhandled Errors (Prevents leaking stack traces)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    req_id = getattr(request.state, "request_id", "unknown")
    logger.error(f"[INTERNAL_ERROR] request_id={req_id} path={request.url.path} error={exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal server error occurred. Please contact system administrator with the request ID.",
            "request_id": req_id
        },
        headers={"X-Request-ID": req_id}
    )

# Security and Tracing Middleware
@app.middleware("http")
async def security_and_tracing_middleware(request: Request, call_next):
    # 1. Request ID Tracing
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.request_id = request_id

    # 2. Maximum Payload Size Defense (15 MB cap)
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > 15 * 1024 * 1024:
                return JSONResponse(
                    status_code=413,
                    content={
                        "detail": "Payload Too Large: Maximum allowed request size is 15MB.",
                        "request_id": request_id
                    },
                    headers={"X-Request-ID": request_id}
                )
        except ValueError:
            pass

    response = await call_next(request)

    # 3. Security Defense Headers
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"
    response.headers["X-XSS-Protection"] = "1; mode=block"

    if ENVIRONMENT == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

    return response

# Enable CORS with explicit allowed origins for production defense
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(recommend_router)
app.include_router(compare_router)
app.include_router(products_router)
app.include_router(admin_router)
app.include_router(feedback_router)
app.include_router(copilot_router)
app.include_router(track_router)

@app.get("/")
def root():
    return {
        "app": PROJECT_NAME,
        "version": "1.0.0",
        "market": "India (INR - ₹)",
        "docs_url": "/docs",
        "status": "active"
    }

@app.get("/api/health")
def health_check():
    db = SessionLocal()
    try:
        prod_count = db.query(Product).count()
        return {
            "status": "healthy",
            "database": "connected",
            "products_count": prod_count,
            "semantic_engine_ready": semantic_engine.is_fitted
        }
    finally:
        db.close()

@app.get("/api/ready")
def readiness_check():
    """Deep readiness probe verifying DB connection and semantic model."""
    status_report = {
        "status": "ready",
        "database": "connected",
        "semantic_engine": "ready" if semantic_engine.is_fitted else "warming_up",
        "environment": ENVIRONMENT
    }
    db = SessionLocal()
    try:
        prod_count = db.query(Product).count()
        status_report["products_count"] = prod_count
    except Exception as db_err:
        logger.error(f"Readiness check failed: {db_err}")
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "error": "Database connectivity failed"}
        )
    finally:
        db.close()
    return status_report
