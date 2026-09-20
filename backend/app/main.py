"""Main FastAPI Application Entrypoint."""
import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from app.database import init_db, SessionLocal
from app.models import Product
from app.config import PROJECT_NAME, DEFAULT_CSV_PATH
from app.services.catalog_service import import_csv_catalog
from app.services.vector_service import semantic_engine

from app.routers.recommend import router as recommend_router
from app.routers.compare import router as compare_router
from app.routers.products import router as products_router
from app.routers.admin import router as admin_router
from app.routers.feedback import router as feedback_router

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
    yield
    print("[INFO] Shutting down SmartPick Backend.")

app = FastAPI(
    title="SmartPick - Indian Laptop Recommendation Engine",
    description="Hybrid RAG Recommendation System with Deterministic Filtering, Multi-Factor Scoring, and Anti-Hallucination Explanations.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
