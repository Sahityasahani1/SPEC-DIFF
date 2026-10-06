"""Catalog Management, CSV Parsing, and Validation Service."""
import csv
import io
import datetime
from typing import List, Tuple, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models import Product
from app.schemas import CSVRowError, CSVUploadResponse
from app.services.vector_service import semantic_engine, generate_text_embedding, create_product_document

REQUIRED_HEADERS = {
    "id", "name", "category", "brand", "price", "ram_gb", "storage_gb",
    "processor", "gpu", "battery_hours", "weight_kg", "rating",
    "description", "pros", "cons", "in_stock"
}

def validate_row(row: Dict[str, str], line_num: int) -> Tuple[Optional[Dict[str, Any]], Optional[CSVRowError]]:
    sku = row.get("id", f"row_{line_num}").strip()
    if not sku:
        return None, CSVRowError(row_number=line_num, sku="UNKNOWN", error="Missing mandatory product 'id' (SKU).")

    # Name validation
    name = row.get("name", "").strip()
    if not name:
        return None, CSVRowError(row_number=line_num, sku=sku, error="Missing mandatory product 'name'.")

    # Price validation
    try:
        price = float(row.get("price", "0").replace(",", "").strip())
        if price <= 0:
            return None, CSVRowError(row_number=line_num, sku=sku, error=f"Invalid price '{row.get('price')}': Must be positive number.")
    except ValueError:
        return None, CSVRowError(row_number=line_num, sku=sku, error=f"Non-numeric price value '{row.get('price')}'.")

    # RAM validation (0 allowed for audio, smartwatches, monitors, etc.)
    try:
        ram_gb = int(row.get("ram_gb", "0").strip())
        if ram_gb not in [0, 1, 2, 3, 4, 6, 8, 12, 16, 18, 24, 32, 36, 48, 64, 96, 128]:
            return None, CSVRowError(row_number=line_num, sku=sku, error=f"Invalid RAM '{ram_gb}'GB: Must be standard capacity (0, 4, 6, 8, 12, 16, 18, 24, 32, 36, 48, 64, 96, 128).")
    except ValueError:
        return None, CSVRowError(row_number=line_num, sku=sku, error=f"Non-numeric RAM value '{row.get('ram_gb')}'.")

    # Storage validation (0 allowed for audio, accessories, etc.)
    try:
        storage_gb = int(row.get("storage_gb", "0").strip())
        if storage_gb < 0:
            return None, CSVRowError(row_number=line_num, sku=sku, error=f"Storage must be non-negative integer.")
    except ValueError:
        return None, CSVRowError(row_number=line_num, sku=sku, error=f"Non-numeric storage value '{row.get('storage_gb')}'.")

    # Rating validation
    try:
        rating = float(row.get("rating", "4.0").strip())
        if not (1.0 <= rating <= 5.0):
            return None, CSVRowError(row_number=line_num, sku=sku, error=f"Rating '{rating}' must be between 1.0 and 5.0.")
    except ValueError:
        rating = 4.0

    # Battery & Weight validation
    try:
        battery_hours = float(row.get("battery_hours", "6.0").strip())
    except ValueError:
        battery_hours = 6.0

    try:
        weight_kg = float(row.get("weight_kg", "1.6").strip())
    except ValueError:
        weight_kg = 1.6

    in_stock_raw = row.get("in_stock", "1").strip().lower()
    in_stock = in_stock_raw in ["1", "true", "yes", "in_stock"]

    clean_data = {
        "id": sku,
        "name": name,
        "category": row.get("category", "laptop").strip().lower() or "laptop",
        "brand": row.get("brand", "Unknown").strip(),
        "price": price,
        "ram_gb": ram_gb,
        "storage_gb": storage_gb,
        "processor": row.get("processor", "Intel Core").strip(),
        "gpu": row.get("gpu", "Integrated Graphics").strip(),
        "battery_hours": battery_hours,
        "weight_kg": weight_kg,
        "rating": rating,
        "ram_expandability": row.get("ram_expandability", "Soldered").strip() or "Soldered",
        "bundled_software": row.get("bundled_software", "None").strip() or "None",
        "display_tech": row.get("display_tech", "FHD IPS Anti-Glare").strip() or "FHD IPS Anti-Glare",
        "retail_source": row.get("retail_source", "Amazon India").strip() or "Amazon India",
        "product_url": row.get("product_url", "").strip(),
        "description": row.get("description", f"{name} laptop").strip(),
        "pros": row.get("pros", "Good value;Reliable").strip(),
        "cons": row.get("cons", "Check specifications").strip(),
        "in_stock": in_stock,
        "source": "uploaded_catalog.csv",
        "catalog_updated_at": datetime.date.today().isoformat()
    }
    return clean_data, None

def import_csv_catalog(db: Session, csv_content: str) -> CSVUploadResponse:
    """
    Parses CSV text, segregates valid vs invalid rows, updates DB, and triggers vector re-indexing.
    """
    reader = csv.DictReader(io.StringIO(csv_content))
    if not reader.fieldnames:
        return CSVUploadResponse(
            status="error",
            imported_count=0,
            rejected_count=0,
            errors=[CSVRowError(row_number=1, sku="HEADER", error="Empty or unparseable CSV content.")],
            indexing_status="aborted",
            catalog_updated_at=datetime.date.today().isoformat()
        )

    # Check for missing essential headers
    present_headers = set(h.strip().lower() for h in reader.fieldnames if h)
    missing = REQUIRED_HEADERS - present_headers
    if missing:
        return CSVUploadResponse(
            status="error",
            imported_count=0,
            rejected_count=0,
            errors=[CSVRowError(row_number=1, sku="HEADER", error=f"Missing required CSV columns: {', '.join(missing)}")],
            indexing_status="aborted",
            catalog_updated_at=datetime.date.today().isoformat()
        )

    valid_rows = []
    errors = []
    line_num = 2  # Line 1 is header

    for row in reader:
        clean_dict, error = validate_row(row, line_num)
        if error:
            errors.append(error)
        else:
            valid_rows.append(clean_dict)
        line_num += 1

    # Upsert valid records
    for data in valid_rows:
        existing = db.query(Product).filter(Product.id == data["id"]).first()
        if existing:
            for k, v in data.items():
                setattr(existing, k, v)
            existing.embedding = generate_text_embedding(create_product_document(existing))
        else:
            product = Product(**data)
            product.embedding = generate_text_embedding(create_product_document(product))
            db.add(product)

    db.commit()

    # Re-index semantic vector engine with all current in-stock products
    all_products = db.query(Product).all()
    semantic_engine.index_products(all_products)

    status_str = "success" if not errors else ("partial_success" if valid_rows else "failed")

    return CSVUploadResponse(
        status=status_str,
        imported_count=len(valid_rows),
        rejected_count=len(errors),
        errors=errors,
        indexing_status="completed" if valid_rows else "skipped",
        catalog_updated_at=datetime.date.today().isoformat()
    )
