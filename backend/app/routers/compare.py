from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import ComparisonRequest, ComparisonResponse
from app.services.comparison_service import compare_products
from app.limiter import limiter
from app.config import RATE_LIMIT_RECOMMEND

router = APIRouter(prefix="/api", tags=["Comparison"])

@router.post("/compare", response_model=ComparisonResponse)
@limiter.limit(RATE_LIMIT_RECOMMEND)
def get_comparison(
    request: Request,
    payload: ComparisonRequest,
    db: Session = Depends(get_db)
):
    try:
        return compare_products(db, payload.product_ids, payload.priority)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")
