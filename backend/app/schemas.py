"""Pydantic Schemas for Request and Response Validation."""
import re
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator

class RecommendationRequest(BaseModel):
    category: str = Field("laptop", pattern=r"^(laptop|smartphone|tablet|audio|smartwatch|monitor|gaming|accessory|tv|component|storage|all)$", description="Product category")
    max_budget: float = Field(..., ge=1000, le=10000000, description="Maximum budget in INR (₹)")
    min_ram_gb: int = Field(0, ge=0, le=128, description="Minimum required RAM in GB (0 for audio/wearables)")
    min_storage_gb: int = Field(0, ge=0, le=4096, description="Minimum required storage in GB (0 for audio/wearables)")
    use_case: str = Field(..., min_length=3, max_length=1000, description="Intended workflow and usage description")
    brand: Optional[str] = Field(None, max_length=50, pattern=r"^[a-zA-Z0-9\s\-\.]*$", description="Preferred brand filter, or null for any")
    priority: str = Field("value", pattern=r"^(value|performance|battery|portability|price)$", description="Ranking priority")

    @field_validator("use_case")
    @classmethod
    def sanitize_use_case(cls, v: str) -> str:
        if not v:
            raise ValueError("use_case cannot be empty")
        # Strip HTML/script tags
        clean = re.sub(r"<[^>]+>", "", v)
        # Strip control characters except standard whitespace
        clean = "".join(ch for ch in clean if ch.isprintable() or ch in "\n\r\t")
        # Collapse multiple spaces
        clean = " ".join(clean.strip().split())
        if len(clean) < 3:
            raise ValueError("use_case too short after sanitization")
        if len(clean) > 1000:
            clean = clean[:1000]
        return clean


class BenchmarkData(BaseModel):
    geekbench_single: Optional[int] = None
    geekbench_multi: Optional[int] = None
    cinebench_r23_multi: Optional[int] = None
    gaming_fps: Optional[Dict[str, int]] = None
    battery_index: Optional[int] = None
    thermal_stability: Optional[int] = None

class PriceSignal(BaseModel):
    price_history: List[Dict[str, Any]] = []
    current_price: float = 0
    all_time_low: float = 0
    all_time_low_date: str = ""
    msrp: float = 0
    signal: str = "FAIR_VALUE"
    signal_reason: str = ""
    estimated_next_sale: str = ""
    estimated_savings: int = 0

class StoreDeal(BaseModel):
    store_id: str
    store_name: str
    domain: str
    logo_text: str
    color: str
    price: float
    formatted_price: str
    in_stock: bool = True
    stock_status: str = "In Stock"
    delivery: str = "Standard Delivery"
    bank_offer: Optional[str] = None
    effective_price: float = 0
    formatted_effective_price: str = ""
    is_best_deal: bool = False
    rating: float = 4.5
    return_policy: str = "7 Days Replacement"
    deal_url: str

class DealComparison(BaseModel):
    best_deal_store: str
    best_deal_store_id: str
    best_price: float
    formatted_best_price: str
    highest_price: float = 0
    formatted_highest_price: str = ""
    savings_vs_highest: float = 0
    savings_pct: float = 0
    stores_count: int = 0
    stores: List[StoreDeal] = []

class CopilotMessage(BaseModel):
    role: str
    content: str

class CopilotRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=2000)
    active_product_ids: Optional[List[str]] = None
    history: List[CopilotMessage] = []

class CopilotResponse(BaseModel):
    reply: str
    relevant_products: List[Dict[str, Any]] = []
    suggested_prompts: List[str] = []

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
    benchmarks: Optional[BenchmarkData] = None
    price_signal: Optional[PriceSignal] = None
    deal_comparison: Optional[DealComparison] = None

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
    benchmarks: Optional[BenchmarkData] = None
    price_signal: Optional[PriceSignal] = None
    deal_comparison: Optional[DealComparison] = None

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

class ClickTrackRequest(BaseModel):
    product_id: str = Field(..., min_length=1, max_length=100)
    retail_source: str = Field(..., max_length=100)
    target_url: str = Field(..., max_length=2000)
    user_agent: Optional[str] = Field(None, max_length=500)

class CatalogUploadAck(BaseModel):
    job_id: str
    status: str = "processing"
    message: str = "Catalog ingestion and embedding processing queued successfully."

class CatalogJobStatus(BaseModel):
    job_id: str
    status: str  # "processing", "completed", "failed"
    imported_count: int = 0
    rejected_count: int = 0
    errors: List[CSVRowError] = []
    created_at: str
    completed_at: Optional[str] = None

