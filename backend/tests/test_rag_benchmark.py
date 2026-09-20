"""20 Golden Indian Market Benchmark Personas Evaluation Suite."""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models import Product
from app.schemas import RecommendationRequest
from app.services.catalog_service import import_csv_catalog
from app.config import DEFAULT_CSV_PATH
from app.services.filter_service import filter_products
from app.services.vector_service import semantic_engine
from app.services.ranking_service import rank_candidates
from app.services.explanation_service import generate_explanation
from app.services.relaxation_service import diagnose_no_match

@pytest.fixture(scope="module")
def benchmark_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    # Load 40 Indian laptops catalog
    with open(DEFAULT_CSV_PATH, "r", encoding="utf-8-sig") as f:
        import_csv_catalog(db, f.read())
    
    yield db
    db.close()

BENCHMARK_SCENARIOS = [
    # (id, name, budget, ram, ssd, use_case, priority, expected_keywords)
    (1, "CS Undergrad", 65000, 16, 512, "Engineering student coding in Python and Docker with upgradable RAM", "value", ["ideapad", "vivobook", "swift", "aspire"]),
    (2, "Casual Gamer", 75000, 16, 512, "Engineering student playing Valorant and GTA V, needs discrete GPU and cooling", "performance", ["loq", "tuf", "nitro", "victus"]),
    (3, "UPSC Aspirant", 55000, 8, 512, "Reading long 1000-page PDFs in study library, needs 10+ hr battery and eye-care anti-glare screen", "battery", ["vivobook", "hp", "honor", "aspire"]),
    (4, "IT Consultant", 99000, 16, 512, "Corporate consultant traveling across India, needs featherlight laptop under 1.3kg with webcam", "portability", ["macbook", "zenbook", "galaxy", "swift", "ideapad", "dell", "inspiron"]),
    (5, "Video Editor", 115000, 16, 512, "Wedding and YouTube video editing in Premiere Pro and DaVinci Resolve with 100% sRGB screen", "performance", ["loq", "helios", "victus", "vivobook", "zenbook", "dell", "g15"]),
    (6, "ML Student", 125000, 16, 1024, "Deep learning student running PyTorch and CUDA locally, needs RTX discrete GPU and 1TB SSD", "performance", ["loq", "helios", "victus", "tuf", "dell", "g15"]),
    (7, "School Student", 35000, 8, 256, "Class 10 student doing homework, browsing web, watching YouTube and using MS Word", "price", ["slim", "aspire", "one"]),
    (8, "Small Business", 45000, 8, 512, "Tally ERP billing, Excel spreadsheets, durable keyboard with number pad", "value", ["ideapad", "hp", "dell", "aspire"]),
    (9, "Student Mac", 70000, 8, 256, "Wants Apple ecosystem on a student budget, fanless silent operation and 15 hour battery", "battery", ["macbook"]),
    (10, "Executive Road Warrior", 135000, 16, 512, "Senior VP traveling weekly, needs 18-hour battery and luxury unibody metal chassis", "battery", ["macbook", "zenbook", "xps", "yoga"]),
    (11, "Esports Gamer", 90000, 16, 512, "Competitive CS2 and Apex Legends player, needs 144Hz high refresh display and RTX graphics", "performance", ["loq", "tuf", "victus", "nitro"]),
    (12, "Architecture Student", 110000, 16, 512, "Running AutoCAD, Revit, 3ds Max 3D rendering with dedicated GPU", "performance", ["loq", "victus", "tuf", "helios", "dell", "g15", "zenbook", "asus"]),
    (13, "Content Writer", 60000, 8, 512, "Freelance writer needing silent operation, comfortable keyboard, and portability", "portability", ["macbook", "vivobook", "slim", "aspire", "hp", "dell"]),
    (14, "Linux Sysadmin", 85000, 16, 512, "Linux engineer dual-booting Ubuntu, needs rugged chassis and dual RAM upgrade slots", "value", ["thinkpad", "loq", "tuf", "dell"]),
    (15, "Music Producer", 100000, 16, 512, "FL Studio and Ableton Live audio production, needs quiet thermals and fast CPU", "value", ["macbook", "zenbook", "swift", "ideapad", "vivobook"]),
    (16, "Medical Professional", 75000, 16, 512, "Doctor doing hospital rounds, needs slim lightweight laptop that is easy to sanitize", "portability", ["galaxy", "swift", "zenbook", "slim", "vivobook"]),
    (17, "GATE CS Aspirant", 50000, 8, 512, "C programming, algorithms, reading PDF textbooks, low budget", "value", ["aspire", "slim", "hp", "dell", "vivobook"]),
    (18, "PowerBI Analyst", 80000, 16, 512, "Corporate business analyst running heavy PowerBI dashboards and SQL queries", "value", ["ideapad", "zenbook", "vivobook", "hp", "dell", "g15"]),
    (19, "Zero-Match Boundary", 40000, 32, 1024, "Wants 32GB RAM and 1TB SSD under ₹40k", "value", []),
    (20, "Stock Outage Check", 70000, 16, 512, "General coding laptop under 70k with out of stock items in DB", "value", [])
]

@pytest.mark.parametrize("case_id, name, budget, ram, ssd, use_case, priority, expected_keywords", BENCHMARK_SCENARIOS)
def test_golden_scenarios(benchmark_db, case_id, name, budget, ram, ssd, use_case, priority, expected_keywords):
    req = RecommendationRequest(
        max_budget=budget,
        min_ram_gb=ram,
        min_storage_gb=ssd,
        use_case=use_case,
        priority=priority
    )
    eligible = filter_products(benchmark_db, req)

    if case_id == 19:
        # Expected zero match
        assert len(eligible) == 0
        unmet, adjustments = diagnose_no_match(benchmark_db, req)
        assert len(unmet) > 0
        assert len(adjustments) > 0
        assert any("RAM" in a or "budget" in a for a in adjustments)
        return

    # Invariant: Every eligible product MUST strictly satisfy the constraints
    assert len(eligible) > 0, f"Scenario {name} should have eligible matches"
    for p in eligible:
        assert p.price <= budget, f"Price violation: {p.name} ₹{p.price} > ₹{budget}"
        assert p.ram_gb >= ram, f"RAM violation: {p.name} {p.ram_gb}GB < {ram}GB"
        assert p.storage_gb >= ssd, f"Storage violation: {p.name} {p.storage_gb}GB < {ssd}GB"
        assert p.in_stock is True, f"Out of stock product returned: {p.name}"

    # Semantic similarity & ranking
    semantic_scores = semantic_engine.compute_similarity(use_case, eligible)
    ranked = rank_candidates(eligible, semantic_scores, req, limit=5)
    assert len(ranked) > 0

    top_product, final_score, sub_scores = ranked[0]
    assert final_score >= 60

    # Explanation grounding verification
    reasons, limitations, evidence = generate_explanation(top_product, req, final_score)
    assert len(reasons) >= 2
    assert len(limitations) >= 1
    assert len(evidence) >= 2

    # Check that top recommendation matches scenario category keywords
    if expected_keywords:
        top_name_lower = top_product.name.lower()
        matched = any(kw in top_name_lower for kw in expected_keywords)
        assert matched, f"Scenario '{name}' top recommendation '{top_product.name}' did not match expected keywords: {expected_keywords}"
