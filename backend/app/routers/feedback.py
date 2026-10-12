"""User Feedback Router with Rate Limiting and Input Sanitization."""
import uuid
import re
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Feedback, RecommendationLog
from app.schemas import FeedbackRequest
from app.limiter import limiter

router = APIRouter(prefix="/api", tags=["Feedback"])

def sanitize_comment(comment: str) -> str:
    """Strip HTML tags and dangerous characters from user comments."""
    if not comment:
        return ""
    clean = re.sub(r"<[^>]+>", "", comment)
    clean = "".join(ch for ch in clean if ch.isprintable() or ch in "\n\r\t")
    return " ".join(clean.strip().split())[:500]

@router.post("/feedback")
@limiter.limit("30/minute")
def submit_feedback(
    request: Request,
    payload: FeedbackRequest,
    db: Session = Depends(get_db)
):
    if payload.rating not in (1, -1):
        raise HTTPException(status_code=400, detail="Rating must be 1 (helpful) or -1 (not helpful).")

    sanitized_comment = sanitize_comment(payload.comment) if payload.comment else None

    # Check recommendation existence
    rec = db.query(RecommendationLog).filter(RecommendationLog.id == payload.recommendation_id).first()
    rec_id = payload.recommendation_id if rec else "rec_untracked"

    # If recommendation_id is not in database, create a fallback recommendation log to maintain FK invariant
    if not rec:
        fallback_rec = RecommendationLog(
            id=payload.recommendation_id,
            request_json="{}",
            result_json="{}",
            latency_ms=0.0
        )
        db.add(fallback_rec)
        db.commit()

    feedback_entry = Feedback(
        id=f"fbk_{uuid.uuid4().hex[:10]}",
        recommendation_id=payload.recommendation_id,
        rating=payload.rating,
        comment=sanitized_comment
    )
    db.add(feedback_entry)
    db.commit()

    return {
        "status": "success",
        "feedback_id": feedback_entry.id,
        "message": "Thank you for your feedback! It helps improve SmartPick recommendations."
    }
