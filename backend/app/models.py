"""SQLAlchemy Database Models."""
import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, Text, ForeignKey
from app.database import Base

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
    description = Column(Text, nullable=False)
    pros = Column(Text, nullable=False)  # Semicolon-delimited or JSON string
    cons = Column(Text, nullable=False)  # Semicolon-delimited or JSON string
    in_stock = Column(Boolean, nullable=False, default=True, index=True)
    source = Column(String(100), nullable=False, default="laptops_india_catalog.csv")
    catalog_updated_at = Column(String(50), nullable=False, default="2026-09-13")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

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
            "description": self.description,
            "pros": [p.strip() for p in self.pros.split(";") if p.strip()],
            "cons": [c.strip() for c in self.cons.split(";") if c.strip()],
            "in_stock": self.in_stock,
            "source": self.source,
            "catalog_updated_at": self.catalog_updated_at
        }

class RecommendationLog(Base):
    __tablename__ = "recommendations"

    id = Column(String(100), primary_key=True, index=True)
    user_id = Column(String(100), nullable=True)
    request_json = Column(Text, nullable=False)
    result_json = Column(Text, nullable=False)
    latency_ms = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(String(100), primary_key=True, index=True)
    recommendation_id = Column(String(100), ForeignKey("recommendations.id"), nullable=False)
    user_id = Column(String(100), nullable=True)
    rating = Column(Integer, nullable=False)  # 1 for helpful, -1 for not helpful
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
