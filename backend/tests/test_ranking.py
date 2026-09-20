"""Unit Tests for 5-Factor Ranking Engine."""
import pytest
from app.models import Product
from app.schemas import RecommendationRequest
from app.services.ranking_service import rank_candidates, compute_priority_score

def make_ranking_candidates():
    p_battery = Product(
        id="lap_battery", name="Long Battery Ultrabook", category="laptop", brand="Apple",
        price=85000, ram_gb=16, storage_gb=512, processor="Apple M2", gpu="Apple 8-core GPU",
        battery_hours=18.0, weight_kg=1.24, rating=4.8, ram_expandability="Soldered",
        bundled_software="None", display_tech="Retina", description="All day battery",
        pros="18h battery", cons="Soldered", in_stock=True
    )
    p_gamer = Product(
        id="lap_gaming", name="Heavy Gaming Rig", category="laptop", brand="Lenovo",
        price=82000, ram_gb=16, storage_gb=512, processor="Intel Core i7-13700HX", gpu="NVIDIA GeForce RTX 4060",
        battery_hours=4.5, weight_kg=2.45, rating=4.6, ram_expandability="Dual Slot Upgradable",
        bundled_software="MS Office", display_tech="165Hz", description="Fast gaming",
        pros="RTX 4060", cons="Heavy", in_stock=True
    )
    p_light = Product(
        id="lap_light", name="Featherweight Slim", category="laptop", brand="Dell",
        price=79000, ram_gb=16, storage_gb=512, processor="Intel Core Ultra 7", gpu="Intel Arc",
        battery_hours=12.0, weight_kg=1.19, rating=4.3, ram_expandability="Soldered",
        bundled_software="MS Office", display_tech="OLED", description="Super light",
        pros="1.19kg", cons="Few ports", in_stock=True
    )
    return [p_battery, p_gamer, p_light]

def test_battery_priority_boosts_endurance():
    candidates = make_ranking_candidates()
    req = RecommendationRequest(
        max_budget=90000, min_ram_gb=16, min_storage_gb=512,
        use_case="Looking for all day battery life for travel", priority="battery"
    )
    semantic_scores = {"lap_battery": 90.0, "lap_gaming": 60.0, "lap_light": 80.0}
    ranked = rank_candidates(candidates, semantic_scores, req)
    
    top_product = ranked[0][0]
    assert top_product.id == "lap_battery"
    assert ranked[0][2]["priority_alignment"] >= 95.0

def test_performance_priority_boosts_rtx_gpu():
    candidates = make_ranking_candidates()
    req = RecommendationRequest(
        max_budget=90000, min_ram_gb=16, min_storage_gb=512,
        use_case="Heavy 3D rendering, machine learning, and AAA gaming", priority="performance"
    )
    semantic_scores = {"lap_battery": 60.0, "lap_gaming": 95.0, "lap_light": 65.0}
    ranked = rank_candidates(candidates, semantic_scores, req)
    
    top_product = ranked[0][0]
    assert top_product.id == "lap_gaming"
    assert ranked[0][2]["priority_alignment"] >= 85.0

def test_portability_priority_boosts_lightweight():
    candidates = make_ranking_candidates()
    req = RecommendationRequest(
        max_budget=90000, min_ram_gb=16, min_storage_gb=512,
        use_case="Daily walking commute, needs to be as lightweight as possible", priority="portability"
    )
    semantic_scores = {"lap_battery": 80.0, "lap_gaming": 50.0, "lap_light": 90.0}
    ranked = rank_candidates(candidates, semantic_scores, req)
    
    # Featherweight (1.19kg) or Battery (1.24kg) should be at the top, gaming (2.45kg) last
    assert ranked[-1][0].id == "lap_gaming"
