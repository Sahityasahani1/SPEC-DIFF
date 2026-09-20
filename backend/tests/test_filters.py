"""Unit Tests for Deterministic Hard Filtering Engine."""
import pytest
from app.models import Product
from app.services.filter_service import apply_hard_filters

def make_sample_products():
    return [
        Product(id="p1", name="Budget 8GB", category="laptop", brand="BrandA", price=35000, ram_gb=8, storage_gb=512, in_stock=True),
        Product(id="p2", name="Mid 16GB", category="laptop", brand="BrandB", price=55000, ram_gb=16, storage_gb=512, in_stock=True),
        Product(id="p3", name="High 16GB", category="laptop", brand="BrandA", price=85000, ram_gb=16, storage_gb=1024, in_stock=True),
        Product(id="p4", name="Pro 32GB", category="laptop", brand="BrandC", price=110000, ram_gb=32, storage_gb=1024, in_stock=True),
        Product(id="p5", name="Out of Stock", category="laptop", brand="BrandA", price=45000, ram_gb=16, storage_gb=512, in_stock=False),
    ]

def test_tc001_budget_cap():
    """TC-001: No product exceeding maximum budget shall ever be returned."""
    products = make_sample_products()
    filtered = apply_hard_filters(products, max_budget=60000, min_ram_gb=8, min_storage_gb=256)
    assert all(p.price <= 60000 for p in filtered)
    assert "p3" not in [p.id for p in filtered]
    assert "p4" not in [p.id for p in filtered]

def test_tc002_ram_floor():
    """TC-002: No product below minimum RAM shall ever be returned."""
    products = make_sample_products()
    filtered = apply_hard_filters(products, max_budget=120000, min_ram_gb=16, min_storage_gb=256)
    assert all(p.ram_gb >= 16 for p in filtered)
    assert "p1" not in [p.id for p in filtered]

def test_tc003_storage_floor():
    """TC-003: No product below minimum storage shall ever be returned."""
    products = make_sample_products()
    filtered = apply_hard_filters(products, max_budget=120000, min_ram_gb=8, min_storage_gb=1024)
    assert all(p.storage_gb >= 1024 for p in filtered)
    assert "p1" not in [p.id for p in filtered]
    assert "p2" not in [p.id for p in filtered]

def test_tc004_out_of_stock_exclusion():
    """TC-004: Out-of-stock products must be strictly excluded even if budget and specs match."""
    products = make_sample_products()
    filtered = apply_hard_filters(products, max_budget=60000, min_ram_gb=8, min_storage_gb=256)
    assert all(p.in_stock is True for p in filtered)
    assert "p5" not in [p.id for p in filtered]

def test_brand_filter():
    """Brand filter must be enforced when specified."""
    products = make_sample_products()
    filtered = apply_hard_filters(products, max_budget=120000, min_ram_gb=8, min_storage_gb=256, brand="BrandA")
    assert all(p.brand.lower() == "branda" for p in filtered)
    assert "p2" not in [p.id for p in filtered]

def test_multi_category_filtering():
    """Multi-category filtering and zero-RAM allowance for audio & wearables."""
    products = [
        Product(id="l1", name="Laptop A", category="laptop", brand="Dell", price=60000, ram_gb=16, storage_gb=512, in_stock=True),
        Product(id="s1", name="Phone A", category="smartphone", brand="Apple", price=70000, ram_gb=8, storage_gb=128, in_stock=True),
        Product(id="a1", name="Headphone A", category="audio", brand="Sony", price=25000, ram_gb=0, storage_gb=0, in_stock=True),
    ]
    # Filter for smartphone
    phone_res = apply_hard_filters(products, max_budget=80000, category="smartphone")
    assert len(phone_res) == 1
    assert phone_res[0].id == "s1"

    # Filter for audio with 0 RAM
    audio_res = apply_hard_filters(products, max_budget=30000, min_ram_gb=0, category="audio")
    assert len(audio_res) == 1
    assert audio_res[0].id == "a1"
