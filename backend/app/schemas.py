"""Pydantic Schemas for Request and Response Validation."""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class RecommendationRequest(BaseModel):
    category: str = Field("laptop", description="Product category: laptop, smartphone, tablet, audio, smartwatch, monitor, or all")
    max_budget: float = Field(..., gt=0, description="Maximum budget in INR (₹)")
    min_ram_gb: int = Field(0, ge=0, le=128, description="Minimum required RAM in GB (0 for audio/wearables)")
    min_storage_gb: int = Field(0, ge=0, le=4096, description="Minimum required storage in GB (0 for audio/wearables)")
    use_case: str = Field(..., min_length=3, max_length=1000, description="Intended workflow and usage description")
    brand: Optional[str] = Field(None, description="Preferred brand filter, or null for any")
    priority: str = Field("value", description="Ranking priority: value, performance, battery, portability, price")

class GroundedEvidence(BaseModel):
    attribute: str
    value: str
    source: str = "laptops_india_catalog.csv"

class ProductRecommendation(BaseModel):
    product_id: str
    name: str
    brand: str
    price: float
    formatted_price: str
    match_score: int
    sub_scores: Dict[str, float]
    specs: Dict[str, Any]
    reasons: List[str]
    limitations: List[str]
    evidence: List[GroundedEvidence]
    retail_source: str
    product_url: str

class UnmetFilterDiagnostic(BaseModel):
    filter: str
    requested_value: Any
    available_alternative: str

class RecommendationResponse(BaseModel):
    status: str  # "success" or "no_match"
    request_id: str
    currency: str = "INR"
    catalog_updated_at: str
    total_eligible_count: int
    recommendations: List[ProductRecommendation] = []
    message: Optional[str] = None
    unmet_filters: Optional[List[UnmetFilterDiagnostic]] = None
    possible_adjustments: Optional[List[str]] = None

class ComparisonRequest(BaseModel):
    product_ids: List[str] = Field(..., min_length=2, max_length=3, description="2 or 3 product IDs to compare")
    priority: str = Field("value", description="Priority to evaluate winner")

class ComparisonProduct(BaseModel):
    id: str
    name: str
    brand: str
    price: float
    formatted_price: str
    ram_gb: int
    storage_gb: int
    processor: str
    gpu: str
    battery_hours: float
    weight_kg: float
    rating: float
    ram_expandability: str
    bundled_software: str
    display_tech: str
    retail_source: str
    product_url: str
    pros: List[str]
    cons: List[str]
    is_winner: bool = False

class ComparisonResponse(BaseModel):
    comparison_count: int
    priority: str
    priority_winner_id: Optional[str] = None
    winner_reason: Optional[str] = None
    products: List[ComparisonProduct]

class FeedbackRequest(BaseModel):
    recommendation_id: str
    rating: int = Field(..., description="1 for helpful, -1 for not helpful")
    comment: Optional[str] = Field(None, max_length=500)

class CSVRowError(BaseModel):
    row_number: int
    sku: str
    error: str

class CSVUploadResponse(BaseModel):
    status: str
    imported_count: int
    rejected_count: int
    errors: List[CSVRowError]
    indexing_status: str
    catalog_updated_at: str

class ProductStockUpdate(BaseModel):
    in_stock: bool
