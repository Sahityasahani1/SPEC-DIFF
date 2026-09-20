"""Multi-Criteria 5-Factor Ranking and Normalization Engine across Electronics."""
from typing import List, Dict, Tuple, Any
from app.models import Product
from app.schemas import RecommendationRequest
from app.config import DEFAULT_WEIGHTS

ZERO_RAM_CATEGORIES = {"audio", "headphones", "smartwatch", "watch", "monitor", "accessories"}

def get_cpu_score(processor: str) -> float:
    p = processor.lower()
    # Flagship laptop & mobile chips
    if any(k in p for k in ["i9", "ryzen 9", "m3 pro", "m3 max", "m4", "14900", "a18 pro", "snapdragon 8 gen 3", "dimensity 9300"]):
        return 98.0
    if any(k in p for k in ["i7", "ryzen 7", "ultra 7", "14700", "7840", "8840", "8945", "a17 pro", "a16", "snapdragon 8 gen 2", "tensor g4"]):
        return 90.0
    if any(k in p for k in ["i5", "ryzen 5", "ultra 5", "13500", "13420", "13450", "m2", "m1", "x elite", "snapdragon 7", "dimensity 8300", "tensor g3"]):
        return 80.0
    if any(k in p for k in ["i3", "ryzen 3", "snapdragon 6", "dimensity 7050", "g99", "helio"]):
        return 65.0
    # Audio / Wearable / Display chips
    if any(k in p for k in ["v1", "h2", "s9", "w5", "dsp", "anc", "driver", "bionic"]):
        return 85.0
    return 70.0

def get_gpu_score(gpu: str) -> float:
    g = gpu.lower()
    if any(k in g for k in ["rtx 4070", "rtx 4080", "rtx 4090"]):
        return 100.0
    if "rtx 4060" in g:
        return 92.0
    if any(k in g for k in ["rtx 4050", "adreno 750", "apple 6-core", "immortalis"]):
        return 85.0
    if any(k in g for k in ["rtx 3050", "adreno 740", "apple 5-core"]):
        return 75.0
    if any(k in g for k in ["arc", "780m", "10-core", "14-core", "adreno 730", "mali-g715"]):
        return 68.0
    if any(k in g for k in ["iris xe", "7-core", "8-core", "vega", "adreno", "mali"]):
        return 58.0
    return 50.0

def compute_priority_score(product: Product, priority: str, max_budget: float) -> float:
    prio = priority.lower().strip()
    cat = (product.category or "").strip().lower()

    if prio == "battery":
        # Normalized based on category
        max_hrs = 36.0 if cat in ["audio", "headphones"] else 24.0 if cat in ["smartphone", "tablet"] else 18.0
        return min(100.0, (product.battery_hours / max_hrs) * 100.0)

    elif prio == "portability":
        # Lighter is better
        max_wt = 0.5 if cat in ["smartphone", "audio", "smartwatch"] else 2.6
        min_wt = 0.05 if cat in ["smartphone", "audio", "smartwatch"] else 1.1
        clamped_wt = max(min_wt, min(max_wt, product.weight_kg))
        return ((max_wt - clamped_wt) / max(0.01, (max_wt - min_wt))) * 60.0 + 40.0

    elif prio == "price":
        # Larger savings under max_budget -> higher score
        savings_ratio = max(0.0, (max_budget - product.price) / max(1.0, max_budget))
        return min(100.0, savings_ratio * 70.0 + 30.0)

    elif prio == "performance":
        cpu_sc = get_cpu_score(product.processor)
        gpu_sc = get_gpu_score(product.gpu)
        if cat in ZERO_RAM_CATEGORIES:
            return 0.7 * cpu_sc + 0.3 * (product.rating / 5.0 * 100.0)
        
        if product.ram_gb >= 24:
            ram_sc = 100.0
        elif product.ram_gb >= 12:
            ram_sc = 85.0
        elif product.ram_gb >= 8:
            ram_sc = 70.0
        else:
            ram_sc = 55.0
        return 0.4 * gpu_sc + 0.4 * cpu_sc + 0.2 * ram_sc

    else:  # "value" or default
        if cat in ZERO_RAM_CATEGORIES:
            return min(100.0, (product.rating / 5.0) * 60.0 + (get_cpu_score(product.processor) / 100.0) * 40.0)
        spec_pts = (product.ram_gb / 16.0) * 30.0 + (product.storage_gb / 512.0) * 30.0 + (product.battery_hours / 10.0) * 20.0
        return min(100.0, spec_pts * 0.6 + (product.rating / 5.0) * 40.0)

def rank_candidates(
    candidates: List[Product],
    semantic_scores: Dict[str, float],
    request: RecommendationRequest,
    limit: int = 5
) -> List[Tuple[Product, int, Dict[str, float]]]:
    """
    Computes multi-criteria composite scores for eligible products across all categories.
    Returns sorted list of (Product, final_score, sub_scores_dict).
    """
    if not candidates:
        return []

    # 1. Calculate raw value scores (spec / price in INR)
    raw_val_ratios = []
    for p in candidates:
        cat = (p.category or "").lower()
        if cat in ZERO_RAM_CATEGORIES:
            spec_pts = (p.rating / 5.0) * 0.5 + min(1.0, (p.battery_hours / 30.0)) * 0.3 + (get_cpu_score(p.processor) / 100.0) * 0.2
            ref_price = 15000.0
        elif cat in ["smartphone", "phone", "tablet"]:
            spec_pts = (p.ram_gb / 12.0) * 0.35 + (p.storage_gb / 256.0) * 0.30 + min(1.0, (p.battery_hours / 24.0)) * 0.20 + (get_gpu_score(p.gpu) / 100.0) * 0.15
            ref_price = 35000.0
        else:
            spec_pts = (p.ram_gb / 16.0) * 0.35 + (p.storage_gb / 512.0) * 0.30 + (p.battery_hours / 10.0) * 0.20 + (get_gpu_score(p.gpu) / 100.0) * 0.15
            ref_price = 50000.0

        ratio = spec_pts / max(0.2, (p.price / ref_price))
        raw_val_ratios.append((p.id, ratio))

    min_ratio = min(r[1] for r in raw_val_ratios)
    max_ratio = max(r[1] for r in raw_val_ratios)

    val_scores = {}
    for pid, r in raw_val_ratios:
        if max_ratio > min_ratio:
            normalized_val = 55.0 + ((r - min_ratio) / (max_ratio - min_ratio)) * 40.0
        else:
            normalized_val = 75.0
        val_scores[pid] = round(normalized_val, 1)

    # 2. Compute composite scores
    results = []
    for p in candidates:
        cat = (p.category or "").lower()
        if cat in ZERO_RAM_CATEGORIES:
            s_req = round(80.0 + (p.rating / 5.0) * 15.0, 1)
        else:
            ram_floor = max(4, request.min_ram_gb) if request.min_ram_gb > 0 else 4
            ssd_floor = max(64, request.min_storage_gb) if request.min_storage_gb > 0 else 64
            ram_bonus = min(15.0, max(0.0, (p.ram_gb - ram_floor) / 16.0 * 15.0))
            ssd_bonus = min(15.0, max(0.0, (p.storage_gb - ssd_floor) / 512.0 * 15.0))
            s_req = round(70.0 + ram_bonus + ssd_bonus, 1)

        # Semantic score
        s_sem = semantic_scores.get(p.id, 75.0)

        # Priority score
        s_prio = round(compute_priority_score(p, request.priority, request.max_budget), 1)

        # Rating score
        s_rat = round((p.rating / 5.0) * 100.0, 1)

        # Value score
        s_val = val_scores.get(p.id, 75.0)

        # Weighted final score
        final_score_raw = (
            DEFAULT_WEIGHTS.w_req * s_req +
            DEFAULT_WEIGHTS.w_sem * s_sem +
            DEFAULT_WEIGHTS.w_prio * s_prio +
            DEFAULT_WEIGHTS.w_rat * s_rat +
            DEFAULT_WEIGHTS.w_val * s_val
        )
        final_score = int(round(final_score_raw))

        sub_scores = {
            "requirement_match": s_req,
            "semantic_relevance": s_sem,
            "priority_alignment": s_prio,
            "customer_rating": s_rat,
            "value_for_money": s_val
        }

        results.append((p, final_score, sub_scores))

    # Sort descending by final score, break ties by rating then lowest price
    results.sort(key=lambda x: (x[1], x[0].rating, -x[0].price), reverse=True)
    return results[:limit]
