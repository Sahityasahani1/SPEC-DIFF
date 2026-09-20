# SpecDiff: AI-Powered Laptop Recommendation Engine (India 🇮🇳)
> *"Skill issue? Nah, spec diff."*

**SpecDiff** is a Gen-Z, AI-powered hybrid recommendation system designed specifically for the **Indian laptop consumer market (INR ₹)**. It bridges the gap between rigid faceted e-commerce filters and unstructured LLM chatbots by combining **deterministic hard filtering**, **dense semantic vector retrieval (RAG)**, a **5-factor multi-criteria scoring algorithm**, and **grounded anti-hallucination explanations**.

---

## 🌟 Key Features

* **🇮🇳 Indian Market Pricing & Segments:**
  * Seed catalog of **40 real-world Indian laptop SKUs** across all 5 price brackets (Budget < ₹42k, College ₹42k–₹65k, Gaming ₹60k–₹85k, Ultrabooks ₹80k–₹1.25L, Flagship > ₹1.25L).
  * Direct tracking of critical Indian purchase determinants: **RAM Expandability** (soldered vs upgradeable), **Bundled Lifetime MS Office**, **Anti-glare display tech**, and street pricing across **Amazon India, Flipkart, Croma, Reliance Digital, and official brand stores**.
* **🔒 100% Deterministic Constraint Invariants:**
  * Guarantees that no laptop exceeding the user's budget in ₹, falling below minimum RAM/storage, or out-of-stock in India is ever recommended.
* **🧠 Semantic RAG Intent Retrieval:**
  * Matches natural language workflows (*"B.Tech CS student coding in Docker"*, *"UPSC library study 12hr battery"*, *"Valorant gaming and cooling"*) via dense cosine vector similarity.
* **⚖️ 5-Factor Ranking Algorithm:**
  $$S_{\text{final}} = 0.35 S_{\text{req}} + 0.25 S_{\text{sem}} + 0.20 S_{\text{prio}} + 0.10 S_{\text{rat}} + 0.10 S_{\text{val}}$$
* **🛡️ Zero-Hallucination Grounded Explanations:**
  * Built-in **Deterministic Factual Synthesizer** runs out of the box in 0ms with zero API key required, citing verified catalog attributes.
  * Optional live LLM support via Google Gemini API when `GEMINI_API_KEY` is provided.
* **💡 Diagnostic Relaxation Engine:**
  * In no-match scenarios (e.g., ₹30k budget for 32GB RAM), diagnoses bottleneck constraints and provides constructive relaxation guidance in Indian Rupees.
* **📊 3-Way Side-by-Side Comparison:**
  * Compare up to 3 laptops with automatic priority winner designation.
* **🛠️ Admin CSV Catalog Management:**
  * Ingest new catalogs with line-by-line error quarantine reports and instant stock status toggles.

---

## 📂 Project Architecture

```
RAG Project/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application entrypoint with CORS
│   │   ├── config.py            # Indian price tiers & scoring weights
│   │   ├── database.py          # SQLite engine (WAL mode enabled)
│   │   ├── models.py            # SQLAlchemy schema (Product, Log, Feedback)
│   │   ├── schemas.py           # Pydantic schemas for API validation
│   │   ├── services/
│   │   │   ├── filter_service.py       # Deterministic hard filter
│   │   │   ├── vector_service.py       # Semantic vector retrieval
│   │   │   ├── ranking_service.py      # 5-factor scoring engine
│   │   │   ├── explanation_service.py  # Factual synthesizer & Gemini LLM
│   │   │   ├── comparison_service.py   # Side-by-side spec matrix & winner
│   │   │   ├── relaxation_service.py   # Diagnostic relaxation suggestions
│   │   │   └── catalog_service.py      # CSV parser & error quarantine
│   │   └── routers/
│   │       ├── recommend.py     # POST /api/recommend
│   │       ├── compare.py       # POST /api/compare
│   │       ├── products.py      # GET /api/products, PATCH stock
│   │       ├── admin.py         # POST /api/admin/catalog/upload, reindex
│   │       └── feedback.py      # POST /api/feedback
│   ├── data/
│   │   ├── laptops_india_catalog.csv # 40 Curated Indian laptop models
│   │   └── seed_db.py           # Seeding script for database
│   ├── tests/
│   │   ├── test_filters.py      # Hard filter invariant tests (TC-001..004)
│   │   ├── test_ranking.py      # Scoring & priority tests
│   │   ├── test_csv_upload.py   # CSV quarantine & error tests (TC-005)
│   │   └── test_rag_benchmark.py# 20 Golden Indian Benchmark Personas
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── App.jsx              # React single page application
    │   ├── components/
    │   │   ├── Header.jsx       # Indian market navbar & health status
    │   │   ├── RecommendationForm.jsx # Budget slider, chips, pills, priorities
    │   │   ├── ProductCard.jsx  # Card with match gauge, INR price, citations
    │   │   ├── ComparisonModal.jsx # Side-by-side matrix & winner banner
    │   │   ├── DiagnosticBanner.jsx # No-match diagnostic relaxation advice
    │   │   ├── CatalogBrowser.jsx # Full searchable catalog table
    │   │   ├── AdminDashboard.jsx # CSV upload, error viewer, stock toggle
    │   │   └── FeedbackModal.jsx  # Rating & comment submission
    │   ├── utils/formatters.js  # INR currency & spec formatters
    │   └── services/api.js      # Backend API client
    ├── index.html
    └── package.json
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
* Python 3.11 or later (tested on Python 3.13)
* Node.js v18 or later (tested on v22)

### 2. Backend Setup & Run
```bash
# Navigate to backend and activate virtualenv
cd backend
.\venv\Scripts\activate

# (Optional) Seed the database with 40 Indian laptop models
python data/seed_db.py

# Start FastAPI server on port 8000
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
* Interactive API Documentation (Swagger): [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* Health Check Endpoint: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

### 3. Frontend Setup & Run
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
* Open your browser at: [http://localhost:5173](http://localhost:5173)

---

## 🧪 Automated Testing

SmartPick includes a comprehensive automated test suite verifying all hard filter invariants and running the **20 Golden Indian Market Benchmark Personas**:

```bash
# Run all tests with verbose output
.\backend\venv\Scripts\pytest backend/tests/ -v
```

**Test Coverage Highlights:**
* `test_filters.py`: 100% hard constraint accuracy (TC-001 Budget, TC-002 RAM, TC-003 Storage, TC-004 Out-of-stock exclusion).
* `test_ranking.py`: Verifies monotonicity and priority shifting (Battery, Portability, Performance, Price).
* `test_csv_upload.py`: Verifies corrupted rows are quarantined without halting valid imports.
* `test_rag_benchmark.py`: Evaluates 20 diverse Indian consumer workflows (B.Tech CS coders, UPSC library readers, casual college gamers, wedding video editors, corporate consultants).
