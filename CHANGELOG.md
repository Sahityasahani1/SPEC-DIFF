# Changelog

All notable changes to the **SpecDiff** AI Hardware Intelligence Platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.0.0] - 2026-09-21

### Added
- **Multi-Category Electronics Catalog (113 SKUs)**:
  - Expanded verified Indian hardware catalog from 79 to 113 unique SKUs across 8 categories: Laptops (41), Smartphones (23), Audio & Headphones (10), Smartwatches & Wearables (10), Tablets (9), Monitors & Displays (8), Gaming Consoles & Handhelds (6), and Keyboards & Peripherals (6).
  - Dense 384-dimensional vector embeddings generated for all 113 items via `all-MiniLM-L6-v2`.
- **Instant Electronic Search Engine (`SearchEngineModal.jsx`)**:
  - Debounced full-text search querying across name, brand, processor, GPU, description, display, and trade-offs.
  - Real-time dynamic category facet chips with live item counts.
  - Single-click budget presets (`Under ₹30K`, `₹30K - ₹60K`, `₹60K - ₹1.2L`, `Above ₹1.2L`).
  - Sort by relevance, price ascending/descending, and customer ratings.
  - Clickable trending discovery chips (`MacBook Air M3`, `Sony WH-1000XM5`, `PlayStation 5`, `LG UltraGear OLED`).
  - Integrated 3-action buttons on every search result: `+ Cart`, `Comp` (compare), and `Deal` (retailer).
- **Persistent Global Shopping Cart (`CartDrawer.jsx`)**:
  - Persistent state synchronized with `localStorage` under `specdiff_cart_v2`.
  - Framer Motion animated slide-out cart drawer.
  - Interactive coupon engine with verified codes:
    - `SPECDIFF5`: 5% VIP Hardware Discount
    - `DIWALI10`: 10% Festive Sale Discount
  - Dynamic MRP street price savings calculation and grand total.
  - Direct addition to cart from Product Cards, Search Engine, Catalog Browser, Spotlight Banner, and Comparison Matrix.
- **Header Cart Trigger**:
  - Added `CART (N)` pill button in `Header.jsx` with real-time item counter.

### Fixed
- Replaced deprecated `datetime.utcnow()` calls with timezone-aware `utc_now()` (`datetime.now(timezone.utc)`) in `backend/app/models.py`, eliminating all 162 deprecation warnings.
- Added Starlette deprecation filters in `backend/pytest.ini`.
- All 41 backend tests now execute with `0 warnings`.

---

## [2.5.0] - 2026-09-20

### Added
- **3D WebGL Hardware Visualizers (Three.js)**:
  - `Laptop3DCanvas.jsx`: Procedural anodized metal unibody laptop with angled display lid, dynamic telemetry canvas screen, studio three-point lighting, and mouse orbit drag controls.
  - `Benchmark3DVisualizer.jsx`: 3D Silicon microchip die hologram with gold wire interconnects and pulsating compute cores.
  - `ParticleConstellation3D.jsx`: Ambient 3D floating particle constellation with cursor parallax in the hero banner.
- **Card Physics & Specular Sheen**:
  - Implemented 3D perspective spatial transforms (`transform-style: preserve-3d`) in `ProductCard.jsx` with spring-damped `rotateX`/`rotateY` tilt and cursor-following holographic specular glare.
- **Revamped Comparison Feature**:
  - `CompareDock.jsx`: Persistent floating dock tracking up to 3 selected products with price chips and quick removal.
  - `ComparisonModal.jsx`: Redesigned spec matrix in Scandinavian Luxury LOFY aesthetic.
  - Added **"Highlight Differences Only"** toggle switch.
  - Automated **"Best-in-Class"** badges (Best Price, Max RAM, Max Storage, Longest Battery, Lightest).
- **Toast Notification System**:
  - Replaced native browser `alert()` dialogs with non-blocking, accessible `ToastNotification.jsx`.

---

## [2.0.0] - 2026-09-18

### Added
- **Admin RBAC Authentication**:
  - Protected all `/api/admin/*` endpoints using `X-Admin-Key` header with automatic HTTP 401 Unauthorized rejection.
- **IP Rate Limiting**:
  - Added `slowapi` rate limiter restricting client IPs to 15 requests/minute.
- **Pydantic v2 Defense**:
  - Input validation and HTML/script sanitization blocking XSS attacks.
- **Two-Tier Redis Caching**:
  - SHA-256 query caching with 1-hour TTL and transparent in-memory LRU/TTL fallback.
- **Synthetic Hardware Telemetry**:
  - `benchmark_service.py`: Geekbench 6, Cinebench R23, and Gaming FPS resolution-calibrated estimates.
  - `price_tracker_service.py`: 30-day historical pricing with Indian festival sale dips and deal signals (`STRONG_BUY`, `FAIR_VALUE`, `WAIT_FOR_SALE`).
- **Interactive AI Copilot**:
  - `/api/copilot` endpoint with Google Gemini integration and rule-based deterministic fallback.
- **Decision Dossier**:
  - Exportable, printable hardware decision dossier in `DecisionDossierModal.jsx`.

---

## [1.0.0] - 2026-09-13

### Added
- Initial release of the SmartPick recommendation engine for the Indian laptop market.
- 40 curated Indian laptop models across 5 price tiers.
- 100% deterministic hard constraint filtering (budget, RAM, storage, stock).
- 5-factor mathematical composite scoring algorithm ($S_{\text{final}}$).
- Grounded factual synthesizer generating anti-hallucination citations.
- 20 Golden Indian Market Benchmark Personas.
