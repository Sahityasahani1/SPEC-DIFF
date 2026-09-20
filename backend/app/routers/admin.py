"""Admin Catalog Management Router."""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Product
from app.schemas import CSVUploadResponse
from app.services.catalog_service import import_csv_catalog
from app.services.vector_service import semantic_engine

router = APIRouter(prefix="/api/admin", tags=["Admin"])

@router.post("/catalog/upload", response_model=CSVUploadResponse)
async def upload_catalog_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files (.csv) are accepted.")
    
    try:
        content_bytes = await file.read()
        content_str = content_bytes.decode("utf-8-sig")
        return import_csv_catalog(db, content_str)
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid file encoding. Please upload UTF-8 encoded CSV.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process CSV: {str(e)}")

@router.post("/catalog/reindex")
def reindex_catalog(db: Session = Depends(get_db)):
    products = db.query(Product).all()
    semantic_engine.index_products(products)
    return {
        "status": "success",
        "message": f"Successfully re-indexed {len(products)} products into semantic vector engine."
    }
