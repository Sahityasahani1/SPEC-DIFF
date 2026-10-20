"""SQLAlchemy Database Models with pgvector HNSW Indexing."""
import datetime
from datetime import timezone
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.ext.compiler import compiles
from pgvector.sqlalchemy import Vector
from app.database import Base

def utc_now():
    """Return current timezone-aware UTC datetime."""
    return datetime.datetime.now(timezone.utc)

# Compile rule allowing Vector column to degrade cleanly to TEXT in SQLite test environments
@compiles(Vector, "sqlite")
def compile_vector_sqlite(type_, compiler, **kw):
    return "TEXT"

class Product(Base):
    __tablename__ = "products"

    id = Column(String(100), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False, default="laptop", index=True)
    brand = Column(String(50), nullable=False, index=True)
    price = Column(Float, nullable=False, index=True)  # Price in INR (₹)
    ram_gb = Column(Integer, nullable=False, index=True)
    storage_gb = Column(Integer, nullable=False, index=True)
    processor = Column(String(150), nullable=False)
    gpu = Column(String(150), nullable=False)
    battery_hours = Column(Float, nullable=False, default=6.0)
    weight_kg = Column(Float, nullable=False, default=1.6)
    rating = Column(Float, nullable=False, default=4.0)
    ram_expandability = Column(String(100), nullable=False, default="Soldered")
    bundled_software = Column(String(100), nullable=False, default="None")
    display_tech = Column(String(150), nullable=False, default="FHD IPS Anti-Glare")
    retail_source = Column(String(100), nullable=False, default="Amazon India")
    product_url = Column(String(500), nullable=False, default="")
    image_url = Column(String(500), nullable=True, default="")
    description = Column(Text, nullable=False)
    pros = Column(Text, nullable=False)  # Semicolon-delimited or JSON string
    cons = Column(Text, nullable=False)  # Semicolon-delimited or JSON string
    in_stock = Column(Boolean, nullable=False, default=True, index=True)
    source = Column(String(100), nullable=False, default="laptops_india_catalog.csv")
    catalog_updated_at = Column(String(50), nullable=False, default="2026-09-13")
    
    # 384-dimensional pgvector dense representation for semantic hardware matching
    embedding = Column(Vector(384), nullable=True)

    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "brand": self.brand,
            "price": self.price,
            "formatted_price": f"₹{int(self.price):,}",
            "ram_gb": self.ram_gb,
            "storage_gb": self.storage_gb,
            "processor": self.processor,
            "gpu": self.gpu,
            "battery_hours": self.battery_hours,
            "weight_kg": self.weight_kg,
            "rating": self.rating,
            "ram_expandability": self.ram_expandability,
            "bundled_software": self.bundled_software,
            "display_tech": self.display_tech,
            "retail_source": self.retail_source,
            "product_url": self.product_url,
            "image_url": self.image_url or "",
            "description": self.description,
            "pros": [p.strip() for p in self.pros.split(";") if p.strip()],
            "cons": [c.strip() for c in self.cons.split(";") if c.strip()],
            "in_stock": self.in_stock,
            "source": self.source,
            "catalog_updated_at": self.catalog_updated_at
        }

# HNSW Cosine Similarity Index on product vector embeddings
Index(
    "product_embedding_hnsw_idx",
    Product.embedding,
    postgresql_using="hnsw",
    postgresql_with={"m": 16, "ef_construction": 64},
    postgresql_ops={"embedding": "vector_cosine_ops"}
)

class RecommendationLog(Base):
    __tablename__ = "recommendations"

    id = Column(String(100), primary_key=True, index=True)
    user_id = Column(String(100), nullable=True)
    request_json = Column(Text, nullable=False)
    result_json = Column(Text, nullable=False)
    latency_ms = Column(Float, nullable=False)
    created_at = Column(DateTime, default=utc_now)

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(String(100), primary_key=True, index=True)
    recommendation_id = Column(String(100), ForeignKey("recommendations.id"), nullable=False)
    user_id = Column(String(100), nullable=True)
    rating = Column(Integer, nullable=False)  # 1 for helpful, -1 for not helpful
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

class ClickLog(Base):
    __tablename__ = "click_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(String(100), index=True, nullable=False)
    retail_source = Column(String(100), nullable=False)
    target_url = Column(String(2000), nullable=False)
    client_ip = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=utc_now)

class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(String(100), ForeignKey("products.id"), index=True, nullable=False)
    price = Column(Float, nullable=False)
    recorded_at = Column(DateTime, default=utc_now, index=True)
    source = Column(String(100), default="market_sync")

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "price": self.price,
            "date": self.recorded_at.strftime("%Y-%m-%d") if self.recorded_at else "",
            "recorded_at": self.recorded_at.isoformat() if self.recorded_at else "",
            "source": self.source
        }

class PriceAlert(Base):
    __tablename__ = "price_alerts"

    id = Column(String(100), primary_key=True, index=True)
    product_id = Column(String(100), ForeignKey("products.id"), index=True, nullable=False)
    user_email = Column(String(255), nullable=False, index=True)
    target_price = Column(Float, nullable=False)
    initial_price = Column(Float, nullable=False)
    is_triggered = Column(Boolean, default=False, index=True)
    triggered_at = Column(DateTime, nullable=True)
    triggered_price = Column(Float, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    product = relationship("Product", backref="alerts")

    def to_dict(self):
        curr_price = self.product.price if self.product else self.initial_price
        savings = max(0, curr_price - self.target_price) if not self.is_triggered else (self.initial_price - (self.triggered_price or self.target_price))
        return {
            "id": self.id,
            "product_id": self.product_id,
            "product_name": self.product.name if self.product else "Unknown Product",
            "product_brand": self.product.brand if self.product else "",
            "product_category": self.product.category if self.product else "",
            "product_image": self.product.image_url if self.product else "",
            "current_price": curr_price,
            "user_email": self.user_email,
            "target_price": self.target_price,
            "initial_price": self.initial_price,
            "is_triggered": self.is_triggered,
            "triggered_at": self.triggered_at.isoformat() if self.triggered_at else None,
            "triggered_price": self.triggered_price,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "potential_savings": round(savings, 2)
        }

class WatchlistItem(Base):
    __tablename__ = "watchlist_items"

    id = Column(String(100), primary_key=True, index=True)
    user_identifier = Column(String(255), nullable=False, index=True)
    product_id = Column(String(100), ForeignKey("products.id"), index=True, nullable=False)
    notes = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=utc_now)

    product = relationship("Product", backref="watchlist_entries")

    def to_dict(self):
        return {
            "id": self.id,
            "user_identifier": self.user_identifier,
            "product_id": self.product_id,
            "product": self.product.to_dict() if self.product else None,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


