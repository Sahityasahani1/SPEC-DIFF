"""Product Comparison Router (POST /api/compare)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import ComparisonRequest, ComparisonResponse
from app.services.comparison_service import compare_products

router = APIRouter(prefix="/api", tags=["Comparison"])

@router.post("/compare", response_model=ComparisonResponse)
def get_comparison(
    request: ComparisonRequest,
    db: Session = Depends(get_db)
):
    try:
        return compare_products(db, request.product_ids, request.priority)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")
