"""Diagnostic Relaxation Engine for No-Match Scenarios."""
from typing import List, Tuple
from sqlalchemy.orm import Session
from app.models import Product
from app.schemas import RecommendationRequest, UnmetFilterDiagnostic

def diagnose_no_match(db: Session, request: RecommendationRequest) -> Tuple[List[UnmetFilterDiagnostic], List[str]]:
    """
    Analyzes why zero products met the criteria and generates constructive,
    minimal relaxation suggestions calibrated to the Indian catalog.
    """
    unmet_filters = []
    adjustments = []

    query = db.query(Product).filter(Product.in_stock == True)
    req_cat = (request.category or "").strip().lower()
    if req_cat and req_cat != "all":
        query = query.filter(Product.category == req_cat)
    all_in_stock = query.all()

    if not all_in_stock:
        return [
            UnmetFilterDiagnostic(
                filter="catalog",
                requested_value=request.category,
                available_alternative="No in-stock products found in catalog."
            )
        ], ["Please verify the catalog is populated and products are in stock."]

    # 1. Test Budget Constraint: Disregard budget, check if RAM + Storage are available
    spec_matches = [
        p for p in all_in_stock 
        if p.ram_gb >= request.min_ram_gb and p.storage_gb >= request.min_storage_gb
    ]

    if spec_matches:
        cheapest_with_spec = min(spec_matches, key=lambda p: p.price)
        if cheapest_with_spec.price > request.max_budget:
            gap = int(cheapest_with_spec.price - request.max_budget)
            unmet_filters.append(
                UnmetFilterDiagnostic(
                    filter="max_budget",
                    requested_value=f"₹{int(request.max_budget):,}",
                    available_alternative=f"Minimum price for {request.min_ram_gb}GB RAM & {request.min_storage_gb}GB SSD is ₹{int(cheapest_with_spec.price):,} ({cheapest_with_spec.name})"
                )
            )
            adjustments.append(
                f"Increase budget by ₹{gap:,} to at least ₹{int(cheapest_with_spec.price):,} to get {cheapest_with_spec.name} ({cheapest_with_spec.ram_gb}GB RAM)."
            )
    else:
        # Neither budget nor specs match together
        max_ram_in_catalog = max(p.ram_gb for p in all_in_stock)
        unmet_filters.append(
            UnmetFilterDiagnostic(
                filter="min_ram_gb",
                requested_value=f"{request.min_ram_gb} GB",
                available_alternative=f"Maximum RAM in catalog is {max_ram_in_catalog} GB"
            )
        )
        adjustments.append(f"Reduce required RAM to {max_ram_in_catalog} GB or lower.")

    # 2. Test RAM within Budget: What is the highest RAM available within the requested budget?
    budget_matches = [p for p in all_in_stock if p.price <= request.max_budget]
    if budget_matches:
        max_ram_in_budget = max(p.ram_gb for p in budget_matches)
        if max_ram_in_budget < request.min_ram_gb:
            best_options = [p for p in budget_matches if p.ram_gb == max_ram_in_budget]
            cheapest = min(best_options, key=lambda p: p.price)
            adjustments.append(
                f"Alternatively, keep your ₹{int(request.max_budget):,} budget and select {max_ram_in_budget} GB RAM (e.g., {cheapest.name} at ₹{int(cheapest.price):,})."
            )
    else:
        cheapest_overall = min(all_in_stock, key=lambda p: p.price)
        adjustments.append(
            f"The most affordable laptop in our catalog starts at ₹{int(cheapest_overall.price):,} ({cheapest_overall.name})."
        )

    # 3. Test Brand Constraint
    if request.brand and request.brand.strip() and request.brand.strip().lower() != "any":
        brand_matches = [p for p in all_in_stock if p.brand.lower() == request.brand.strip().lower()]
        if not brand_matches:
            unmet_filters.append(
                UnmetFilterDiagnostic(
                    filter="brand",
                    requested_value=request.brand,
                    available_alternative=f"No in-stock {request.brand} models found in current catalog."
                )
            )
            adjustments.append(f"Clear the brand filter to search across all top brands (Lenovo, ASUS, HP, Apple, Acer).")

    return unmet_filters, adjustments
