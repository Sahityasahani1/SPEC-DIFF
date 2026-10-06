"""Admin Catalog Management Router with RBAC and Asynchronous Ingestion."""
import uuid
import datetime
import asyncio
from typing import Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db, SessionLocal
from app.models import Product
from app.schemas import CatalogUploadAck, CatalogJobStatus
from app.services.catalog_service import import_csv_catalog
from app.services.vector_service import semantic_engine
from app.services.cache_service import cache_service
from app.auth import verify_admin_key

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"],
    dependencies=[Depends(verify_admin_key)]
)

# Background job registry
CATALOG_UPLOAD_JOBS: Dict[str, Dict[str, Any]] = {}

def process_catalog_upload_task(job_id: str, content_str: str):
    """Background worker executing validation, DB insertion, reindexing, and cache invalidation."""
    db = SessionLocal()
    try:
        res = import_csv_catalog(db, content_str)
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
        CATALOG_UPLOAD_JOBS[job_id].update({
            "status": "failed",
            "errors": [{"row_number": 0, "sku": "JOB_ERROR", "error": str(e)}],
            "completed_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        })
    finally:
        db.close()

@router.post("/catalog/upload", response_model=CatalogUploadAck)
async def upload_catalog_csv(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """
    Asynchronously ingest product catalog CSV with row quarantine and embedding regeneration.
    Immediately returns an ingestion job tracking ID.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files (.csv) are accepted.")

    try:
        content_bytes = await file.read()
        content_str = content_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid file encoding. Please upload UTF-8 encoded CSV.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read CSV: {str(e)}")

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
async def reindex_catalog(db: Session = Depends(get_db)):
    """Forces semantic embedding reindex across all catalog items and flushes cache."""
    products = db.query(Product).all()
    semantic_engine.index_products(products)
    await cache_service.invalidate_catalog_cache()
    return {
        "status": "success",
        "message": f"Successfully re-indexed {len(products)} products and flushed recommendation cache."
    }
