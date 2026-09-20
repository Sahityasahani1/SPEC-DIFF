"""User Feedback Router (POST /api/feedback)."""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Feedback, RecommendationLog
from app.schemas import FeedbackRequest

router = APIRouter(prefix="/api", tags=["Feedback"])

@router.post("/feedback")
def submit_feedback(
    payload: FeedbackRequest,
    db: Session = Depends(get_db)
):
    # Check recommendation existence
    rec = db.query(RecommendationLog).filter(RecommendationLog.id == payload.recommendation_id).first()
    if not rec:
        # If recommendation log is missing, we can still record feedback or create placeholder
        pass

    feedback_entry = Feedback(
        id=f"fbk_{uuid.uuid4().hex[:10]}",
        recommendation_id=payload.recommendation_id,
        rating=payload.rating,
        comment=payload.comment
    )
    db.add(feedback_entry)
    db.commit()

    return {
        "status": "success",
        "feedback_id": feedback_entry.id,
        "message": "Thank you for your feedback! It helps improve SmartPick recommendations."
    }
