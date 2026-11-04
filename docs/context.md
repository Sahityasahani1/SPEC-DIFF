# SpecDiff Platform Context & Agent Quick-Start Guide (`context.md`)

> **Note for Future AI Agents**: Read this document first before inspecting the codebase. This single reference provides the complete architectural topology, component connections, file locations, data schemas, API routes, operational commands, and change playbooks. Reading this document eliminates the need to recursively explore the directory tree, minimizing token usage while ensuring 100% architectural alignment.

---

## 1. Executive System Overview & Mission

**SpecDiff (formerly SmartPick)** is an enterprise-grade AI Hardware Intelligence and Retrieval-Augmented Generation (RAG) Platform engineered for the Indian electronics market (prices denominated in INR ₹).

### Core Capabilities
1. **Zero-Hallucination Hardware Recommendations (`/api/recommend`)**: Combines strict SQL/deterministic constraint filtering with 384-dimensional dense semantic vector retrieval and a 5-factor mathematical scoring engine.
2. **Side-by-Side Spec Comparison Matrix (`/api/compare`)**: Multi-device head-to-head comparison with automated priority-winner designation.
3. **SpecPlug AI Copilot (`/api/copilot`)**: A witty, deeply grounded Indian electronics advisor with a 3-tier execution model (Gemini API $\rightarrow$ local 4-bit Qwen-2.5-1.5B LoRA on RTX 3050 $\rightarrow$ zero-dependency standalone rule engine).
4. **Daily Scheduled Market Price Engine & Price Drop Alerts (`/api/alerts`)**: Midnight IST automatic price adjustments, 30-day historical tracking with festival sales simulation, and target threshold notifications.
5. **Hardware Stash / Watchlist (`/api/watchlist`)**: User-specific saved hardware stashes with aggregate valuation metrics.
6. **3D WebGL Graphics & Card Tilt Physics**: Zero-asset procedural 3D laptop inspection, microchip die holograms, and Framer Motion spring-damped card physics.

---

## 2. High-Level Architectural Flow & Component Connectivity

```mermaid
flowchart TD
    subgraph Client_Layer ["Frontend Client (React 18 + Vite + Tailwind CSS)"]
        UI_Home[App.jsx & Header]
        UI_Rec[RecommendationForm & ProductCard]
        UI_Comp[CompareDock, ComparisonModal & DecisionDossier]
        UI_Alert[PriceAlertModal & WatchlistDrawer]
        UI_Copilot[AICopilotDrawer (SpecPlug)]
        UI_3D[Laptop3DCanvas & Benchmark3DVisualizer]
        API_Client[frontend/src/services/api.js]
        
        UI_Rec --> API_Client
        UI_Comp --> API_Client
        UI_Alert --> API_Client
        UI_Copilot --> API_Client
    end

    subgraph Gateway_Security ["Layer 1: Security & Rate Limiting"]
        API_Client -->|HTTP /api/*| FASTAPI[FastAPI Gateway (backend/app/main.py)]
        FASTAPI --> RBAC{Admin Route?}
        RBAC -->|Yes| AUTH[Verify X-Admin-Key (backend/app/auth.py)]
        RBAC -->|No| LIMITER[SlowAPI Rate Limiter (backend/app/limiter.py)]
        AUTH --> LIMITER
        LIMITER --> SANITIZE[Pydantic v2 Sanitization (backend/app/schemas.py)]
    end

    subgraph Caching_Tier ["Layer 2: Two-Tier Cache"]
        SANITIZE --> CACHE_SVC[Cache Service (backend/app/services/cache_service.py)]
        CACHE_SVC -->|Hit| CACHE_RET[Return Cached Response]
        CACHE_SVC -->|Miss| ROUTERS[Router Dispatch Tier]
    end

    subgraph Business_Routers ["Layer 3: FastAPI Routers (backend/app/routers/)"]
        ROUTERS --> R_REC[recommend.py: /api/recommend]
        ROUTERS --> R_COMP[compare.py: /api/compare]
        ROUTERS --> R_PROD[products.py: /api/products]
        ROUTERS --> R_ALERT[alerts.py: /api/alerts & /api/watchlist]
        ROUTERS --> R_COPILOT[copilot.py: /api/copilot]
        ROUTERS --> R_ADMIN[admin.py: /api/admin/*]
        ROUTERS --> R_TRACK[track.py: /api/track/click]
        ROUTERS --> R_FEEDBACK[feedback.py: /api/feedback]
    end

    subgraph Core_Services ["Layer 4: Intelligence Services (backend/app/services/)"]
        R_REC --> FILTER_SVC[filter_service.py: Strict Constraints]
        FILTER_SVC --> VECTOR_SVC[vector_service.py: 384-dim Dense Retrieval / RRF]
        VECTOR_SVC --> RANK_SVC[ranking_service.py: 5-Factor Composite Formula]
        RANK_SVC --> BENCH_SVC[benchmark_service.py: Synthetic Benchmarks & FPS]
        RANK_SVC --> PRICE_SVC[price_tracker_service.py: 30-Day Signals]
        RANK_SVC --> DEAL_SVC[store_deals_service.py: Multi-Store Comparison]
        RANK_SVC --> EXPL_SVC[explanation_service.py: Anti-Hallucination Grounding]
        
        R_REC -.->|Zero Matches| RELAX_SVC[relaxation_service.py: Minimal Diagnostic Relaxation]
        
        R_COMP --> COMP_SVC[comparison_service.py: Head-to-Head Matrix]
        
        R_COPILOT --> COPILOT_LLM{3-Tier Model Dispatch}
        COPILOT_LLM -->|Tier 1| GEMINI[Google Gemini API]
        COPILOT_LLM -->|Tier 2| LOCAL_LLM[local_llm_service.py: Qwen-2.5-1.5B LoRA on RTX 3050]
        COPILOT_LLM -->|Tier 3| STANDALONE_COPILOT[Deterministic SpecPlug Knowledge Rules]

        R_ALERT --> MARKET_PRICE_SVC[market_price_service.py: Price Sync & Alert Evaluation]
    end

    subgraph Data_Storage ["Layer 5: Persistence & ML Models"]
        FILTER_SVC --> DB[(SQLite: smartpick.db / PostgreSQL 16 + pgvector)]
        VECTOR_SVC --> DB
        R_ALERT --> DB
        MARKET_PRICE_SVC --> DB
        
        SCHEDULER[daily_price_sync_worker: Midnight IST] --> MARKET_PRICE_SVC
        LOCAL_LLM --> LORA_WEIGHTS[backend/train/specplug_qwen_1.5b_lora/]
    end
```

---

## 3. Directory Map & File Registry

```
c:\sahityaa\RAG Project\
├── API.md                                   # Comprehensive REST API reference manual
├── ARCHITECTURE.md                          # In-depth architectural & mathematical specification
├── CHANGELOG.md                             # Release notes and feature changelog
├── CONTRIBUTING.md                          # Development guidelines and coding conventions
├── DEPLOYMENT.md                            # Production deployment, Docker, and Nginx guides
├── docker-compose.yml                       # Docker Compose spec (PostgreSQL 16 pgvector + Redis 7 + Backend + Frontend)
├── FunctionsDetailed.txt                    # Detailed catalog functions reference
├── package-lock.json                        # Root lockfile (if npm used at root)
├── PRD.md                                   # Product Requirements Document
├── README.md                                # Project showcase & user-facing overview
├── run.sh                                   # Master startup script (launches backend uvicorn & frontend vite)
├── SECURITY.md                              # Vulnerability reporting & DevSecOps security audit
├── start_backend.sh                         # Dedicated backend runner script
├── start_frontend.sh                        # Dedicated frontend runner script
├── verify_daily_sync.py                     # Daily sync verification & database integrity check script
│
├── backend/
│   ├── Dockerfile                           # Production Python 3.11 Docker container definition
│   ├── pytest.ini                           # Pytest configuration and warning filters
│   ├── requirements.txt                     # Backend dependencies (FastAPI, SQLAlchemy, pgvector, etc.)
│   ├── smartpick.db                         # Local development SQLite database (~1,176 products, 136,000+ price points)
│   ├── venv/                                # Dedicated Python virtual environment (Windows: venv\Scripts\)
│   │
│   ├── alembic/                             # Alembic database migrations
│   │   ├── env.py                           # Migration execution environment
│   │   └── versions/0001_initial_pgvector.py# Initial PostgreSQL + pgvector schema migration
│   │
│   ├── app/
│   │   ├── __init__.py
│   │   ├── auth.py                          # Admin API key validation (X-Admin-Key & Bearer headers)
│   │   ├── config.py                        # Pydantic-validated environment configuration & scoring weights
│   │   ├── database.py                      # SQLAlchemy async/sync database session factory
│   │   ├── limiter.py                       # SlowAPI IP-keyed sliding window rate limiter
│   │   ├── main.py                          # FastAPI application factory, lifespan hooks & midnight scheduler
│   │   ├── models.py                        # SQLAlchemy ORM models (Product, PriceAlert, WatchlistItem, etc.)
│   │   ├── schemas.py                       # Pydantic v2 validation models & query input sanitization
│   │   │
│   │   ├── routers/
│   │   │   ├── admin.py                     # Admin endpoints: CSV ingestion, vector reindexing, telemetry
│   │   │   ├── alerts.py                    # Price drop alerts & hardware watchlist CRUD endpoints
│   │   │   ├── compare.py                   # Multi-product comparison & priority-winner evaluation
│   │   │   ├── copilot.py                   # SpecPlug conversational AI hardware advisor
│   │   │   ├── feedback.py                  # User feedback & rating logging
│   │   │   ├── products.py                  # Catalog browsing, ILIKE search, and stock updates
│   │   │   ├── recommend.py                 # Core RAG recommendation engine
│   │   │   └── track.py                     # Outbound affiliate click tracking
│   │   │
│   │   └── services/
│   │       ├── benchmark_service.py         # Synthetic Geekbench, Cinebench, and Gaming FPS engine
│   │       ├── cache_service.py             # Distributed Redis cache with in-memory LRU fallback
│   │       ├── catalog_service.py           # CSV catalog import, validation, and quarantine processing
│   │       ├── comparison_service.py        # Side-by-side spec differential scoring
│   │       ├── explanation_service.py       # Grounded anti-hallucination explanation synthesis
│   │       ├── filter_service.py            # Strict deterministic hard-constraint filtering
│   │       ├── local_llm_service.py         # 4-bit QLoRA Qwen-2.5-1.5B local inference for RTX 3050
│   │       ├── market_price_service.py      # Real-time price updates, festival calendar & alert evaluation
│   │       ├── price_tracker_service.py     # 30-day historical pricing curves & deal signal classification
│   │       ├── ranking_service.py           # 5-factor mathematical composite scoring engine
│   │       ├── relaxation_service.py        # Minimal diagnostic relaxation engine for zero-match queries
│   │       ├── store_deals_service.py       # Multi-retailer comparison (Amazon, Flipkart, Croma, Reliance)
│   │       └── vector_service.py            # 384-dim dense semantic vector embeddings & BM25 hybrid RRF
│   │
│   ├── data/                                # Data ingestion, seed scripts, and verification artifacts
│   │   ├── amazon_exact_images.json         # High-resolution Amazon India image asset mapping
│   │   ├── apply_exact_product_images.py    # Database script to apply verified product images
│   │   ├── laptops_india_catalog.csv        # Baseline curated laptop catalog
│   │   ├── populate_electronics.py          # Catalog populator for 8 electronics categories
│   │   ├── run_final_verification.py        # Automated test verification runner
│   │   ├── seed_db.py                       # Database seeder script
│   │   ├── sync_amazon_catalog.py           # Amazon catalog scraper & sync script
│   │   ├── sync_csv_images.py               # Image synchronization utility
│   │   └── sync_daily_market_prices.py      # Standalone daily market price synchronization script
│   │
│   ├── tests/                               # Comprehensive pytest test suite (58 passing tests)
│   │   ├── conftest.py                      # Test fixtures, mock databases, and test clients
│   │   ├── test_csv_upload.py               # Tests for admin CSV upload and quarantine logging
│   │   ├── test_filters.py                  # Unit tests for deterministic hard constraint filtering
│   │   ├── test_platform_upgrade.py         # Integration tests for async database & caching
│   │   ├── test_price_alerts.py             # Tests for price drop alerts & watchlist stashes
│   │   ├── test_production_modules.py       # Benchmark, store deals, and relaxation tests
│   │   ├── test_rag_benchmark.py            # Latency benchmarks (<15ms cache hit) & accuracy
│   │   ├── test_ranking.py                  # Mathematical scoring & weight validation tests
│   │   └── test_security_audit.py           # SlowAPI rate limiting & HTML sanitization tests
│   │
│   └── train/                               # SpecPlug Local LLM Fine-Tuning Pipeline
│       ├── generate_specplug_dataset.py     # Converts catalog into training instruction pairs
│       ├── ingest_amazon_electronics.py     # Prepares raw electronics data for dataset generation
│       ├── specplug_train.jsonl             # Fine-tuning training set
│       ├── specplug_val.jsonl               # Fine-tuning validation set
│       ├── test_specplug_qwen.py            # Inference verification for fine-tuned LoRA
│       ├── train_specplug_qwen.py           # QLoRA 4-bit fine-tuning script for NVIDIA RTX 3050 (6GB)
│       └── specplug_qwen_1.5b_lora/         # Trained LoRA adapter weights (safetensors)
│
└── frontend/
    ├── index.html                           # HTML template with Google Fonts
    ├── package.json                         # Frontend dependencies (React 18, Three.js, Framer Motion, Vite)
    ├── vite.config.js                       # Vite configuration with /api reverse proxy to 127.0.0.1:8000
    ├── tailwind.config.js                   # Tailwind styling and custom color tokens
    │
    └── src/
        ├── main.jsx                         # React entrypoint mounting QueryClientProvider
        ├── App.jsx                          # Main shell orchestrating tabs, modals, carts, and state
        ├── index.css                        # Global CSS, cyber grid backgrounds, and scrollbar styles
        │
        ├── components/
        │   ├── AdminDashboard.jsx           # CSV catalog upload, reindex trigger, system telemetry UI
        │   ├── AICopilotDrawer.jsx          # SpecPlug AI interactive drawer with conversational history
        │   ├── Benchmark3DVisualizer.jsx    # Procedural 3D microchip die & pulsing cores (Three.js)
        │   ├── BenchmarkVisualizer.jsx      # Synthetic 2D benchmark bars & gaming FPS radar
        │   ├── CartDrawer.jsx               # Flyout shopping cart drawer with localStorage persistence
        │   ├── CatalogBrowser.jsx           # Grid/list multi-category catalog browser with search/filters
        │   ├── CommandPalette.jsx           # Global keyboard navigation palette (Ctrl+K / Cmd+K)
        │   ├── CompareDock.jsx              # Sticky bottom dock showing pinned comparison items
        │   ├── ComparisonModal.jsx          # Side-by-side spec comparison table & winner badge
        │   ├── DecisionDossierModal.jsx     # Comprehensive audit report of recommendation reasoning
        │   ├── DiagnosticBanner.jsx         # Non-intrusive warning when relaxed criteria are applied
        │   ├── FeedbackModal.jsx            # Star rating and feedback submission modal
        │   ├── Header.jsx                   # Navigation bar with category switcher, search, cart, and stash
        │   ├── HeroBanner.jsx               # Visual promotional banner with live price updates
        │   ├── Laptop3DCanvas.jsx           # Procedural 3D unibody laptop canvas with orbital controls
        │   ├── ParticleConstellation3D.jsx  # WebGL background particle effect
        │   ├── PriceAlertModal.jsx          # Modal to create target price drop alerts
        │   ├── PriceHistoryChart.jsx        # Recharts 30-day interactive pricing curve with festival dips
        │   ├── ProductCard.jsx              # Hardware card with 3D spring tilt physics, badges, and buy-box
        │   ├── RecommendationForm.jsx       # User query form (budget, RAM, storage, category, priority)
        │   ├── SearchEngineModal.jsx        # Instant full-text modal search engine across all categories
        │   ├── StoreDealsComparison.jsx     # Multi-store price comparison component (Amazon, Flipkart, etc.)
        │   ├── ToastNotification.jsx        # Lightweight slide-in notification toast
        │   └── WatchlistDrawer.jsx          # Hardware stash drawer with aggregate valuation
        │
        ├── services/
        │   └── api.js                       # Centralized fetch client for all backend REST endpoints
        │
        └── utils/
            ├── dealUrl.js                   # Retailer affiliate URL builder with search query fallback
            ├── formatters.js                # Currency (₹ INR), storage, and number formatters
            └── productImages.js             # High-res fallback images by product ID/category
```

---

## 4. Core Subsystems & How Components Connect

### 4.1 Recommendation & Retrieval Pipeline (`/api/recommend`)
Located across [`backend/app/routers/recommend.py`](file:///c:/sahityaa/RAG%20Project/backend/app/routers/recommend.py) and `backend/app/services/`:

1. **Deterministic Hard-Constraint Filter (`filter_service.py`)**:
   - Queries products where `in_stock == True`.
   - Invariant: `price <= max_budget` (zero budget overruns).
   - Invariant: `ram_gb >= min_ram_gb` and `storage_gb >= min_storage_gb` (computing categories only; bypassed for audio/wearables).
   - Category and brand filters applied.
2. **Diagnostic Relaxation Fallback (`relaxation_service.py`)**:
   - If hard filtering yields 0 products, the pipeline does *not* fail.
   - Diagnoses the constraint failure (e.g., "Need ₹3,000 more for 16GB RAM") and returns suggested minimal adjustments with relaxed candidates.
3. **Dense Vector Retrieval (`vector_service.py`)**:
   - Computes normalized 384-dimensional dense semantic vectors using sublinear n-gram hashing and BM25 Reciprocal Rank Fusion (RRF).
   - Matches colloquial user intent (e.g., "coding in Python and Docker") against product descriptions, pros, cons, and processor details.
4. **5-Factor Composite Scoring Engine (`ranking_service.py`)**:
   $$S_{\text{final}} = 0.35 S_{\text{req}} + 0.25 S_{\text{sem}} + 0.20 S_{\text{prio}} + 0.10 S_{\text{rat}} + 0.10 S_{\text{val}}$$
   - $S_{\text{req}}$: Budget margin and excess memory/storage.
   - $S_{\text{sem}}$: Dense vector cosine similarity.
   - $S_{\text{prio}}$: Boost for selected priority (`performance`, `battery`, `portability`, `price`, `value`).
   - $S_{\text{rat}}$: Verified customer rating.
   - $S_{\text{val}}$: Spec-to-Rupee index against category average.
5. **Synthetic Benchmark Telemetry (`benchmark_service.py`)**:
   - Computes Geekbench 6 single/multi-core, Cinebench R23, and calibrated FPS for CS2, Valorant, GTA V, and Cyberpunk 2077.
6. **30-Day Price Tracker & Store Deals (`price_tracker_service.py`, `store_deals_service.py`)**:
   - Synthesizes 30-day historical price dips reflecting Indian shopping festivals (Great Indian Festival, Big Billion Days, Diwali).
   - Classifies signals: `STRONG_BUY` (within 5% of 30-day low), `WAIT_FOR_SALE` (>95% of MSRP), or `FAIR_VALUE`.
   - Simulates multi-store buy-boxes across Amazon, Flipkart, Croma, Reliance Digital, and official brand stores.
7. **Grounded Anti-Hallucination Explanations (`explanation_service.py`)**:
   - Formulates natural language rationale and grounded evidence strictly from verified database attributes.

### 4.2 Real-Time Price Tracking, Daily Midnight Sync & Alert Engine
Located in [`backend/app/routers/alerts.py`](file:///c:/sahityaa/RAG%20Project/backend/app/routers/alerts.py) and [`backend/app/services/market_price_service.py`](file:///c:/sahityaa/RAG%20Project/backend/app/services/market_price_service.py):

- **Automated Midnight Sync**:
  - `backend/app/main.py` runs a background task `daily_price_sync_worker()` triggering every day at Midnight IST (18:30 UTC).
  - Updates product street prices, appends a new record to the `price_history` table for every SKU (1,176 products), and updates `catalog_updated_at`.
  - Re-indexes semantic embeddings in `semantic_engine`.
  - Generates snapshot files (`pre_run_snapshot_*.json` and verification reports).
- **Price Drop Alert Evaluation**:
  - Whenever a product price decreases, `market_price_service.py` evaluates all active `PriceAlert` records where `target_price >= new_price`.
  - Triggers alerts: sets `is_triggered = True`, `triggered_price = new_price`, and records `triggered_at`.
  - Triggered notifications are queryable via `GET /api/alerts/notifications`.

### 4.3 Hardware Stash (Watchlist) & Shopping Cart System
- **Hardware Stash (`WatchlistItem`)**:
  - Users save products to their personal hardware stash via `POST /api/watchlist`.
  - Stash drawer calculates aggregate valuation in ₹ INR and lists live prices, specs, and notes.
- **Shopping Cart**:
  - Managed client-side in `App.jsx` and persisted across browser sessions via `localStorage` (`specdiff_cart_v2`).
  - Supports quantity adjustments, aggregate cart totals, and item removals.

### 4.4 SpecPlug AI Copilot (3-Tier Architecture)
Located in [`backend/app/routers/copilot.py`](file:///c:/sahityaa/RAG%20Project/backend/app/routers/copilot.py):

- **Tier 1 (Cloud Gemini API)**: If `GEMINI_API_KEY` is provided, queries Google Gemini with prompt grounding restricted strictly to verified Indian product specs.
- **Tier 2 (Local Qwen-2.5-1.5B LoRA on RTX 3050)**: If `USE_LOCAL_LLM=true` and CUDA is available, executes local inference using the fine-tuned 4-bit LoRA model (`backend/train/specplug_qwen_1.5b_lora`) in ~2.2 GB VRAM.
- **Tier 3 (Standalone Rule Engine)**: Zero external API fallback. Detects category, brand, and comparison intent to produce witty, spec-backed advice with clickable follow-up suggestions.

---

## 5. Database Schema & Data Models

SpecDiff uses SQLAlchemy ORM defined in [`backend/app/models.py`](file:///c:/sahityaa/RAG%20Project/backend/app/models.py). It operates transparently on SQLite for local development (`backend/smartpick.db`) and PostgreSQL 16 + pgvector in production Docker containers.

### Tables Overview

| Table Name | Description | Key Columns |
| :--- | :--- | :--- |
| `products` | Master electronics catalog (1,176+ items) | `id` (PK), `name`, `category`, `brand`, `price`, `ram_gb`, `storage_gb`, `processor`, `gpu`, `battery_hours`, `weight_kg`, `rating`, `display_tech`, `in_stock`, `catalog_updated_at`, `embedding` (Vector 384) |
| `price_history`| Daily historical price logs (136k+ points) | `id` (PK, auto), `product_id` (FK $\rightarrow$ products.id), `price`, `recorded_at`, `source` |
| `price_alerts` | Price drop target threshold alerts | `id` (PK), `product_id` (FK $\rightarrow$ products.id), `user_email`, `target_price`, `initial_price`, `is_triggered`, `triggered_at`, `triggered_price` |
| `watchlist_items` | User saved hardware stashes | `id` (PK), `user_identifier`, `product_id` (FK $\rightarrow$ products.id), `notes`, `created_at` |
| `recommendations`| Telemetry logs for recommendation requests | `id` (PK), `user_id`, `request_json`, `result_json`, `latency_ms`, `created_at` |
| `feedback` | User rating & comments | `id` (PK), `recommendation_id` (FK $\rightarrow$ recommendations.id), `rating` (+1 / -1), `comment` |
| `click_logs` | Outbound retailer affiliate click tracking | `id` (PK, auto), `product_id`, `retail_source`, `target_url`, `client_ip`, `user_agent` |

### Supported Electronics Categories
`laptop`, `smartphone`, `audio`, `smartwatch`, `tablet`, `monitor`, `gaming`, `accessory` (or `all`).

---

## 6. API Endpoints Quick Reference Table

| Method | Endpoint | Description | Auth Required | Rate Limit |
| :--- | :--- | :--- | :---: | :---: |
| `GET` | `/api/health` | System health check & DB status | No | - |
| `POST` | `/api/recommend` | 5-factor ranked RAG recommendations | No | 15/min |
| `POST` | `/api/compare` | Head-to-head spec comparison matrix | No | 20/min |
| `GET` | `/api/products` | Multi-category catalog search & facets | No | 60/min |
| `GET` | `/api/products/{id}` | Detailed product information | No | 60/min |
| `PATCH`| `/api/products/{id}/stock` | Toggle in-stock status & re-index vector | No / Admin | 30/min |
| `POST` | `/api/copilot` | SpecPlug AI Hardware Advisor | No | 10/min |
| `POST` | `/api/alerts` | Create or update price drop alert | No | 20/min |
| `GET` | `/api/alerts` | List registered alerts by user email | No | 30/min |
| `DELETE`| `/api/alerts/{id}` | Remove / cancel active alert | No | 30/min |
| `GET` | `/api/alerts/notifications` | Get triggered price drop alerts | No | 30/min |
| `POST` | `/api/alerts/simulate-trigger/{id}` | Test simulate alert triggering | No | - |
| `POST` | `/api/watchlist` | Add hardware SKU to stash | No | 30/min |
| `GET` | `/api/watchlist` | Get user stash & total valuation | No | 30/min |
| `DELETE`| `/api/watchlist/{id}` | Remove hardware SKU from stash | No | 30/min |
| `POST` | `/api/feedback` | Record recommendation rating/comment | No | 30/min |
| `POST` | `/api/track/click` | Track outbound affiliate clicks | No | - |
| `POST` | `/api/admin/catalog/upload` | Async CSV catalog ingestion | **Yes (`X-Admin-Key`)** | 5/min |
| `GET` | `/api/admin/catalog/upload/{job_id}` | Check CSV upload job status | **Yes (`X-Admin-Key`)** | 30/min |
| `POST` | `/api/admin/catalog/reindex` | Force re-index vector embeddings | **Yes (`X-Admin-Key`)** | 5/min |
| `GET` | `/api/admin/system/health` | Admin telemetry & cache statistics | **Yes (`X-Admin-Key`)** | 30/min |

---

## 7. Agent Change Playbook (The Fast-Routing Matrix)

> **Use this table to immediately identify which files to modify for any given task without exploring the entire project.**

| If You Need To... | Primary Files To Modify | Key Functions / Symbols |
| :--- | :--- | :--- |
| **Change Ranking Weights or Formula** | `backend/app/config.py`<br>`backend/app/services/ranking_service.py` | `ScoringWeights`, `compute_priority_score()`, `compute_composite_score()` |
| **Modify Hard Filters or Invariants** | `backend/app/services/filter_service.py`<br>`backend/app/schemas.py` | `apply_hard_filters()`, `RecommendationRequest` |
| **Adjust Diagnostic Relaxation Rules**| `backend/app/services/relaxation_service.py` | `diagnose_no_match()` |
| **Add or Modify a REST Endpoint** | `backend/app/routers/<name>.py`<br>`backend/app/schemas.py`<br>`frontend/src/services/api.js` | `@router.get/post/patch`, Pydantic models, client fetch function |
| **Change Vector Embeddings or Search**| `backend/app/services/vector_service.py` | `generate_text_embedding()`, `create_product_document()`, `HybridSemanticEngine` |
| **Add / Edit Database Models** | `backend/app/models.py`<br>`backend/app/schemas.py`<br>`backend/alembic/versions/` | SQLAlchemy model class, Pydantic schemas, migration scripts |
| **Change Price Alert or Stash Logic**| `backend/app/routers/alerts.py`<br>`backend/app/models.py`<br>`frontend/src/components/PriceAlertModal.jsx`<br>`frontend/src/components/WatchlistDrawer.jsx` | `create_price_alert()`, `add_to_watchlist()`, `get_user_watchlist()` |
| **Modify SpecPlug Copilot Persona/Logic**| `backend/app/routers/copilot.py`<br>`frontend/src/components/AICopilotDrawer.jsx` | `_generate_specplug_standalone_advice()`, system prompt, quick prompt suggestions |
| **Update Synthetic Benchmarks or FPS** | `backend/app/services/benchmark_service.py` | `CPU_BENCHMARK_MAP`, `get_gaming_fps()`, `get_benchmarks()` |
| **Modify Multi-Store Deals Simulation** | `backend/app/services/store_deals_service.py` | `RETAILER_METADATA`, `get_store_deals()` |
| **Tweak 3D WebGL Graphics or Physics** | `frontend/src/components/Laptop3DCanvas.jsx`<br>`frontend/src/components/Benchmark3DVisualizer.jsx`<br>`frontend/src/components/ProductCard.jsx` | Three.js scene setup, procedural meshes, Framer Motion springs |
| **Add New UI Tab or Global State** | `frontend/src/App.jsx`<br>`frontend/src/components/Header.jsx` | `activeTab` state, modal toggle states, handler functions |
| **Change Rate Limiting or Security** | `backend/app/limiter.py`<br>`backend/app/auth.py`<br>`backend/app/config.py` | `limiter`, `verify_admin_key()`, `RATE_LIMIT_*` |
| **Update Daily Price Sync or Cron** | `backend/app/main.py`<br>`backend/app/services/market_price_service.py`<br>`verify_daily_sync.py` | `daily_price_sync_worker()`, `sync_catalog_market_prices()` |

---

## 8. Development, Environment & Execution Guide

### 8.1 Python Environment & Running Tests
The project has a dedicated virtual environment in `backend/venv/`. On Windows PowerShell, always use the virtual environment's executables:

```powershell
# Run the complete test suite (all 58 tests)
& backend\venv\Scripts\pytest.exe backend\tests -v

# Run a specific test file
& backend\venv\Scripts\pytest.exe backend\tests\test_price_alerts.py -v
```

### 8.2 Starting the Servers Locally

```powershell
# Terminal 1: Start Backend (FastAPI on http://127.0.0.1:8000)
cd backend
& .\venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2: Start Frontend (Vite on http://localhost:5173)
cd frontend
npm run dev
```

Alternatively, run the master script:
```bash
./run.sh
```

### 8.3 Key Environment Variables (`.env`)
```env
ENVIRONMENT=development
DATABASE_URL=sqlite:///./smartpick.db
REDIS_URL=redis://localhost:6379/0
ADMIN_API_KEY=specdiff_admin_secret_key_2026
GEMINI_API_KEY=your_gemini_api_key_here
USE_LOCAL_LLM=false
RATE_LIMIT_RECOMMEND=15/minute
CACHE_TTL_SECONDS=3600
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

---

## 9. Historical Context, Previous Milestones & Git Log

### Key Git Commits
1. **`1ab106d`** — *Initial commit: SPEC-DIFF RAG Project*
   - Foundation RAG pipeline, SQLite catalog, deterministic constraint filtering, and initial React UI.
2. **`3a136a9`** — *Update project Files and Features*
   - Multi-category expansion, Three.js 3D laptop canvas, Framer Motion card physics, and Decision Dossier.
3. **`8fe36f4`** — *Update project with latest changes*
   - Security audit hardening, SlowAPI rate limiting (15/min), Pydantic HTML sanitization, X-Admin-Key RBAC, and Amazon exact image mappings.
4. **`a776da4`** — *Price drop alert and hardware watchlist system implemented*
   - Added `price_alerts` and `watchlist_items` tables, `backend/app/routers/alerts.py`, PriceAlertModal, WatchlistDrawer, and test suite.
5. **`6492c67`** — *Update daily market price sync verification reports and pre-run snapshots through 2026-11-01*
   - Daily price sync verified across 1,176 products and 136,416 price history points. Repository synced with GitHub `origin/main`.
6. **`SECURITY_HARDENING_2026`** — *Comprehensive CNS & Application CyberSecurity Hardening*
   - Redacted PII emails (`j***@domain.com`) in price alert feeds.
   - Patched IDOR on alert deletions with email verification.
   - Gated simulation triggers with admin RBAC and disabled in production.
   - Fortified dynamic web scraper against SSRF with strict HTTPS & hostname allowlisting.
   - Enforced retail domain verification in outbound click tracking, blocking open redirects.
   - Added Content Security Policy (CSP) header and tightened CORS allowed methods/headers.
   - Hardened AI Copilot prompt boundaries against injection and bounded conversation history.
   - Isolated PostgreSQL and Redis host ports in Docker Compose with password enforcement.
   - Expanded test suite to 65 passing automated tests (100% pass rate).
8. **`MOBILE_AND_DESKTOP_OPTIMIZATION_2026`** — *Full Responsive Mobile Phone & Desktop Enhancement*
   - **Mobile Bottom Navigation Bar (`Header.jsx`)**: Fixed 16-height thumb navigation for screens `< md` featuring Configurator, Catalog, Stash, Cart, and Admin tabs with badge counters and $\ge 48\text{px}$ touch targets.
   - **Hero Banner Responsiveness (`HeroBanner.jsx`)**: Adapted typography scale (`text-3xl xs:text-4xl sm:text-7xl md:text-8xl`), container padding (`p-5 sm:p-12 md:p-16`), and smooth horizontal persona swiping (`overflow-x-auto no-scrollbar`).
   - **Recommendation Form Mobile Ergonomics (`RecommendationForm.jsx`)**: Horizontal category pill scrolling, responsive budget slider typography, and $\ge 44\text{px}$ tap targets on RAM, storage, and priority buttons.
   - **Product Card Dual Layout (`ProductCard.jsx`)**: 2-row thumb-accessible action grid on mobile (`Row 1: [+ Cart] [View Deal]`; `Row 2: [Compare] [Alert] [Stash]`), retaining inline luxury row on desktop. Added `touch-pan-y` for effortless vertical scrolling across 3D tilt cards.
   - **Compare Dock & Drawers Clearance (`CompareDock.jsx`, `CartDrawer.jsx`, `WatchlistDrawer.jsx`, `AICopilotDrawer.jsx`)**: Floated compare dock above mobile bottom navigation (`bottom-20 md:bottom-6`), full mobile viewport width (`pl-0 sm:pl-10`), and mobile-responsive SpecPlug floating drawer (`top-0 sm:top-16`).
   - **Build & Test Verification**: 100% clean production build (`vite build` in 47.94s) and all 65/65 backend pytest tests passing.


### Upstream Git Remote
- **Repository**: `https://github.com/Sahityasahani1/SPEC-DIFF.git`
- **Primary Branch**: `main`
