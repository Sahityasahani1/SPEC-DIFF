"""Recommendation Router (POST /api/recommend)."""
import time
import uuid
import json
import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import RecommendationLog, Product
from app.schemas import (
    RecommendationRequest,
    RecommendationResponse,
    ProductRecommendation,
    BenchmarkData,
    PriceSignal,
    DealComparison
)
from app.services.filter_service import filter_products
from app.services.vector_service import semantic_engine
from app.services.ranking_service import rank_candidates
from app.services.explanation_service import generate_explanation
from app.services.relaxation_service import diagnose_no_match
from app.services.benchmark_service import get_benchmarks
from app.services.price_tracker_service import get_price_signal
from app.services.store_deals_service import get_store_deals
from app.services.cache_service import cache_service
from app.limiter import limiter
from app.config import RATE_LIMIT_RECOMMEND

router = APIRouter(prefix="/api", tags=["Recommendation"])

@router.post("/recommend", response_model=RecommendationResponse)
@limiter.limit(RATE_LIMIT_RECOMMEND)
async def get_recommendations(
    request: Request,
    rec_request: RecommendationRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    # 0. Check Redis / In-Memory Query Cache
    cache_key = cache_service.generate_key(rec_request)
    cached_payload = await cache_service.get(cache_key)
    if cached_payload:
        response.headers["X-Cache"] = "HIT"
        return RecommendationResponse(**cached_payload)

    start_time = time.time()
    req_id = f"rec_{uuid.uuid4().hex[:10]}"
    catalog_date = datetime.date.today().isoformat()

    # 1. Deterministic Hard Filtering
    eligible_products = filter_products(db, rec_request)

    # Ensure semantic engine is fitted
    if not semantic_engine.is_fitted:
        all_prods = db.query(Product).all()
        semantic_engine.index_products(all_prods)

    # 2. Handle Zero-Match Boundary with Diagnostic Recovery
    if not eligible_products:
        unmet_filters, adjustments = diagnose_no_match(db, rec_request)
        elapsed_ms = (time.time() - start_time) * 1000.0

        # Log query
        log_entry = RecommendationLog(
            id=req_id,
            request_json=json.dumps(rec_request.model_dump()),
            result_json=json.dumps({"status": "no_match", "eligible_count": 0}),
            latency_ms=elapsed_ms
        )
        db.add(log_entry)
        db.commit()

        no_match_response = RecommendationResponse(
            status="no_match",
            request_id=req_id,
            currency="INR",
            catalog_updated_at=catalog_date,
            total_eligible_count=0,
            recommendations=[],
            message="No laptops in our Indian catalog satisfy all your mandatory requirements.",
            unmet_filters=unmet_filters,
            possible_adjustments=adjustments
        )
        await cache_service.set(cache_key, no_match_response.model_dump())
        response.headers["X-Cache"] = "MISS"
        return no_match_response

    # 3. Dense Semantic Vector Retrieval
    semantic_scores = semantic_engine.compute_similarity(rec_request.use_case, eligible_products)

    # 4. Multi-Factor 5-Factor Ranking
    ranked_tuples = rank_candidates(eligible_products, semantic_scores, rec_request, limit=5)

    # 5. Grounded Explanation Generation
    recommendations = []
    for product, final_score, sub_scores in ranked_tuples:
        reasons, limitations, evidence = generate_explanation(product, rec_request, final_score)
        
        benchmarks_data = get_benchmarks(product)
        price_data = get_price_signal(product)
        deal_data = get_store_deals(product)

        specs_dict = {
            "ram_gb": product.ram_gb,
            "storage_gb": product.storage_gb,
            "processor": product.processor,
            "gpu": product.gpu,
            "battery_hours": product.battery_hours,
            "weight_kg": product.weight_kg,
            "rating": product.rating,
            "ram_expandability": product.ram_expandability,
            "bundled_software": product.bundled_software,
            "display_tech": product.display_tech
        }

        rec = ProductRecommendation(
            product_id=product.id,
            name=product.name,
            brand=product.brand,
            price=product.price,
            formatted_price=f"₹{int(product.price):,}",
            match_score=final_score,
            sub_scores=sub_scores,
            specs=specs_dict,
            reasons=reasons,
            limitations=limitations,
            evidence=evidence,
            retail_source=product.retail_source,
            product_url=product.product_url or f"https://www.amazon.in/s?k={product.name.replace(' ', '+')}",
            benchmarks=BenchmarkData(**benchmarks_data) if benchmarks_data.get('geekbench_single') else None,
            price_signal=PriceSignal(**price_data),
            deal_comparison=DealComparison(**deal_data)
        )
        recommendations.append(rec)

    elapsed_ms = (time.time() - start_time) * 1000.0

    # Log to audit history
    log_entry = RecommendationLog(
        id=req_id,
        request_json=json.dumps(rec_request.model_dump()),
        result_json=json.dumps([r.model_dump() for r in recommendations]),
        latency_ms=elapsed_ms
    )
    db.add(log_entry)
    db.commit()

    success_response = RecommendationResponse(
        status="success",
        request_id=req_id,
        currency="INR",
        catalog_updated_at=catalog_date,
        total_eligible_count=len(eligible_products),
        recommendations=recommendations
    )

    await cache_service.set(cache_key, success_response.model_dump())
    response.headers["X-Cache"] = "MISS"
    return success_response
