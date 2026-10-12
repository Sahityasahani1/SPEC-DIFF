"""Admin Catalog Management Router with RBAC, Chunked Ingestion, and Memory Defense."""
import uuid
import datetime
import asyncio
from pathlib import Path
from typing import Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks, Request
from sqlalchemy.orm import Session
from app.database import get_db, SessionLocal
from app.models import Product
from app.schemas import CatalogUploadAck, CatalogJobStatus
from app.services.catalog_service import import_csv_catalog
from app.services.vector_service import semantic_engine
from app.services.cache_service import cache_service
from app.auth import verify_admin_key
from app.limiter import limiter

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"],
    dependencies=[Depends(verify_admin_key)]
)

# Background job registry with bounded capacity
MAX_STORED_JOBS = 100
MAX_CSV_BYTES = 10 * 1024 * 1024  # 10 MB strict file cap
CATALOG_UPLOAD_JOBS: Dict[str, Dict[str, Any]] = {}

def process_catalog_upload_task(job_id: str, content_str: str):
    """Background worker executing validation, DB insertion, reindexing, and cache invalidation."""
    db = SessionLocal()
    try:
        res = import_csv_catalog(db, content_str)
        if job_id in CATALOG_UPLOAD_JOBS:
            CATALOG_UPLOAD_JOBS[job_id].update({
                "status": "completed",
                "imported_count": res.imported_count,
                "rejected_count": res.rejected_count,
                "errors": [err.model_dump() for err in res.errors],
                "completed_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
            })
        # Flush cached recommendations
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(cache_service.invalidate_catalog_cache())
            loop.close()
        except Exception:
            pass
    except Exception as e:
        if job_id in CATALOG_UPLOAD_JOBS:
            CATALOG_UPLOAD_JOBS[job_id].update({
                "status": "failed",
                "errors": [{"row_number": 0, "sku": "JOB_ERROR", "error": "Internal processing error occurred"}],
                "completed_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
            })
    finally:
        db.close()

@router.post("/catalog/upload", response_model=CatalogUploadAck)
@limiter.limit("10/minute")
async def upload_catalog_csv(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """
    Asynchronously ingest product catalog CSV with row quarantine, size boundaries, and embedding regeneration.
    Immediately returns an ingestion job tracking ID.
    """
    raw_name = file.filename or ""
    clean_name = Path(raw_name).name.lower()
    if not clean_name.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files (.csv) are accepted.")

    # Stream file in bounded chunks to prevent memory exhaustion
    total_bytes = 0
    chunks = []
    chunk_size = 64 * 1024  # 64 KB

    try:
        while True:
            chunk = await file.read(chunk_size)
            if not chunk:
                break
            total_bytes += len(chunk)
            if total_bytes > MAX_CSV_BYTES:
                raise HTTPException(
                    status_code=413,
                    detail=f"File exceeds maximum allowed size of {MAX_CSV_BYTES // (1024 * 1024)}MB."
                )
            chunks.append(chunk)

        content_bytes = b"".join(chunks)
        content_str = content_bytes.decode("utf-8-sig")
    except HTTPException:
        raise
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid file encoding. Please upload UTF-8 encoded CSV.")
    except Exception:
        raise HTTPException(status_code=400, detail="Malformed or unreadable CSV upload.")

    # Maintain bounded job history (evict oldest 20 if capacity reached)
    if len(CATALOG_UPLOAD_JOBS) >= MAX_STORED_JOBS:
        sorted_keys = sorted(
            CATALOG_UPLOAD_JOBS.keys(),
            key=lambda k: CATALOG_UPLOAD_JOBS[k].get("created_at", "")
        )
        for k in sorted_keys[:20]:
            CATALOG_UPLOAD_JOBS.pop(k, None)

    job_id = str(uuid.uuid4())
    CATALOG_UPLOAD_JOBS[job_id] = {
        "job_id": job_id,
        "status": "processing",
        "imported_count": 0,
        "rejected_count": 0,
        "errors": [],
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "completed_at": None
    }

    background_tasks.add_task(process_catalog_upload_task, job_id, content_str)

    return CatalogUploadAck(
        job_id=job_id,
        status="processing",
        message="Catalog ingestion and embedding processing queued successfully."
    )

@router.get("/catalog/upload/{job_id}", response_model=CatalogJobStatus)
def get_upload_job_status(job_id: str):
    """Checks progress and reports imported count or quarantined errors for an ingestion job."""
    job = CATALOG_UPLOAD_JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Catalog upload job '{job_id}' not found.")
    return CatalogJobStatus(**job)

@router.post("/catalog/reindex")
@limiter.limit("10/minute")
async def reindex_catalog(request: Request, db: Session = Depends(get_db)):
    """Forces semantic embedding reindex across all catalog items and flushes cache."""
    products = db.query(Product).all()
    semantic_engine.index_products(products)
    await cache_service.invalidate_catalog_cache()
    return {
        "status": "success",
        "message": f"Successfully re-indexed {len(products)} products and flushed recommendation cache."
    }

@router.post("/catalog/sync-market-prices")
@limiter.limit("5/minute")
async def sync_market_prices(request: Request, db: Session = Depends(get_db)):
    """Triggers live hybrid real-market price synchronization across all catalog products."""
    from app.services.market_price_service import sync_catalog_market_prices
    result = sync_catalog_market_prices(db)
    products = db.query(Product).all()
    semantic_engine.index_products(products)
    await cache_service.invalidate_catalog_cache()
    return {
        "status": "success",
        "message": f"Market price sync completed successfully for {result.get('updated_count', 0)} products.",
        "details": result
    }

