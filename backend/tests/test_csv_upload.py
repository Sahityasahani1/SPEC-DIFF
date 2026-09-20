"""Unit Tests for CSV Upload and Row-Level Validation."""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models import Product
from app.services.catalog_service import import_csv_catalog

@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    yield db
    db.close()

def test_tc005_csv_validation_quarantine(test_db):
    """TC-005: Corrupted rows are quarantined with line numbers; valid rows are imported."""
    sample_csv = """id,name,category,brand,price,ram_gb,storage_gb,processor,gpu,battery_hours,weight_kg,rating,description,pros,cons,in_stock
lap_valid_01,Valid Notebook,laptop,BrandA,45000,16,512,Intel i5,Iris Xe,8.0,1.5,4.5,A good laptop,Fast,None,1
lap_bad_price,Bad Price Laptop,laptop,BrandB,-500,16,512,Intel i5,Iris Xe,8.0,1.5,4.5,Bad price,None,None,1
lap_bad_ram,Bad RAM Laptop,laptop,BrandC,40000,10,512,Intel i5,Iris Xe,8.0,1.5,4.5,Bad RAM,None,None,1
lap_valid_02,Second Valid,laptop,BrandD,60000,16,512,Ryzen 7,Radeon,7.0,1.6,4.4,Another good,Fast,None,1
"""
    res = import_csv_catalog(test_db, sample_csv)
    
    assert res.status == "partial_success"
    assert res.imported_count == 2
    assert res.rejected_count == 2
    
    # Verify the two valid products exist in DB
    p1 = test_db.query(Product).filter(Product.id == "lap_valid_01").first()
    p2 = test_db.query(Product).filter(Product.id == "lap_valid_02").first()
    assert p1 is not None
    assert p2 is not None

    # Verify bad ones were NOT imported
    p_bad = test_db.query(Product).filter(Product.id == "lap_bad_price").first()
    assert p_bad is None

    # Verify error line numbers
    error_rows = [e.row_number for e in res.errors]
    assert 3 in error_rows  # row 3 is lap_bad_price
    assert 4 in error_rows  # row 4 is lap_bad_ram
