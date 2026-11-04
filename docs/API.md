# SpecDiff REST API Specification

This document provides a comprehensive reference for all REST endpoints exposed by the SpecDiff AI Hardware Intelligence Platform (`http://127.0.0.1:8000/api`).

All endpoints return JSON responses and support CORS. Interactive Swagger UI is available at `/docs` and ReDoc is available at `/redoc`.

---

## 🔐 Authentication & Rate Limiting

### Admin Authentication
All endpoints under `/api/admin/*` require the `X-Admin-Key` header or an `Authorization: Bearer <ADMIN_API_KEY>` header.
- **Default Development Key**: `specdiff_admin_secret_key_2026`
- **Rejection**: Unauthenticated or invalid requests receive `HTTP 401 Unauthorized`.

```bash
# Example Authenticated Request
curl -X POST http://127.0.0.1:8000/api/admin/catalog/reindex \
  -H "X-Admin-Key: specdiff_admin_secret_key_2026"
```

### Rate Limiting
Endpoints are rate-limited per client IP using `slowapi`:
- **Default Limit**: 15 requests per minute (`15/minute`).
- **Rejection**: Requests exceeding this threshold receive `HTTP 429 Too Many Requests`.

---

## 📋 Endpoints Overview

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/health` | System health check and database connection verification | No |
| `POST` | `/api/recommend` | Generate ranked hardware recommendations using 5-factor scoring | No |
| `POST` | `/api/compare` | Side-by-side spec comparison matrix and priority winner | No |
| `GET` | `/api/products` | Multi-category electronic catalog with search and facet counts | No |
| `GET` | `/api/products/{id}` | Detailed product information with benchmarks & price signals | No |
| `PATCH`| `/api/products/{id}/stock` | Update stock availability and trigger vector re-index | No |
| `POST` | `/api/copilot` | Interactive hardware advisor with grounded recommendations | No |
| `POST` | `/api/admin/catalog/upload` | Asynchronous CSV catalog ingestion with quarantine reporting | **Yes** |
| `GET` | `/api/admin/catalog/upload/{job_id}` | Check async CSV ingestion status and error details | **Yes** |
| `POST` | `/api/admin/catalog/reindex` | Force re-index of dense vector embeddings | **Yes** |
| `GET` | `/api/admin/system/health` | Detailed telemetry, cache hit ratios, and latency metrics | **Yes** |
| `POST` | `/api/feedback` | Record user feedback rating and optional comment | No |
| `POST` | `/api/feedback/click` | Track outbound retailer deal click-throughs | No |

---

## 🔍 Core Recommendation & Search Endpoints

### 1. Generate Recommendations
`POST /api/recommend`

Generates ranked hardware recommendations based on strict constraints and natural language intent.

#### Request Body (`application/json`):
```json
{
  "max_budget": 85000,
  "min_ram_gb": 16,
  "min_storage_gb": 512,
  "use_case": "B.Tech CS student coding in Python, Docker containers, casual gaming with good battery life.",
  "category": "laptop",
  "priority": "value",
  "brand": null
}
```

#### Field Descriptions:
- `max_budget` (float, required): Hard budget ceiling in INR (₹). No recommended item will exceed this price.
- `min_ram_gb` (int, default: 8): Minimum RAM capacity floor in GB.
- `min_storage_gb` (int, default: 256): Minimum SSD capacity floor in GB.
- `use_case` (string, required, 5-2000 chars): Colloquial workflow description for dense semantic RAG retrieval.
- `category` (string, default: "laptop"): Category constraint (`laptop`, `smartphone`, `audio`, `smartwatch`, `tablet`, `monitor`, `gaming`, `accessory`, `all`).
- `priority` (string, default: "value"): Weighting bias (`performance`, `battery`, `portability`, `price`, `value`).
- `brand` (string, optional): Specific brand filter (`Apple`, `ASUS`, `Lenovo`, etc.).

#### Successful Response (`200 OK`):
```json
{
  "status": "success",
  "request_id": "rec_f8e219ba48c1",
  "total_eligible_candidates": 14,
  "priority_applied": "value",
  "recommendations": [
    {
      "product_id": "laptop_macbook_air_m3",
      "name": "Apple MacBook Air 13\" (M3, 2024)",
      "brand": "Apple",
      "category": "laptop",
      "price": 89990.0,
      "formatted_price": "₹89,990",
      "match_score": 94.2,
      "score_breakdown": {
        "requirement_score": 98.0,
        "semantic_similarity": 91.5,
        "priority_boost": 95.0,
        "rating_score": 96.0,
        "value_score": 90.5
      },
      "reasons": [
        "Unbeatable fanless silent operation with class-leading 18-hour battery endurance for full coding days.",
        "3nm Apple Silicon M3 provides exceptional single-core responsiveness and hardware-accelerated mesh shading."
      ],
      "limitations": [
        "Base configuration includes 8GB unified memory which is soldered and cannot be upgraded later."
      ],
      "evidence": [
        { "attribute": "Processor", "value": "Apple M3 (8-core CPU, 10-core GPU)" },
        { "attribute": "Battery Life", "value": "18.0 hours verified" },
        { "attribute": "Weight", "value": "1.24 kg" }
      ],
      "benchmarks": {
        "geekbench_single": 3100,
        "geekbench_multi": 12000,
        "cinebench_r23_multi": 15600,
        "gaming_fps": { "CS2": 60, "Valorant": 110, "GTA_V": 35, "Cyberpunk_2077": 18 },
        "battery_index": 90,
        "thermal_stability": 82
      },
      "price_signal": {
        "current_price": 89990.0,
        "all_time_low": 84990.0,
        "all_time_low_date": "2026-09-08",
        "msrp": 99900.0,
        "signal": "STRONG_BUY",
        "signal_reason": "Price is very close to 30-day all-time low.",
        "estimated_next_sale": "Amazon Great Indian",
        "estimated_savings": 10000
      },
      "specs": {
        "ram_gb": 16,
        "storage_gb": 512,
        "processor": "Apple M3",
        "gpu": "10-Core Integrated GPU",
        "battery_hours": 18.0,
        "weight_kg": 1.24
      }
    }
  ]
}
```

---

### 2. Multi-Category Electronic Catalog & Search
`GET /api/products`

Retrieves catalog items with multi-column ILIKE search, filtering, and live category facets.

#### Query Parameters:
- `q` (string, optional): Full-text search term across name, brand, processor, GPU, description, pros, and cons.
- `category` (string, optional): Category slug (`laptop`, `smartphone`, `audio`, `smartwatch`, `tablet`, `monitor`, `gaming`, `accessory`, `all`).
- `brand` (string, optional): Brand filter (e.g. `Sony`, `Apple`, `Logitech`).
- `min_price` (float, optional): Minimum street price floor in ₹.
- `max_price` (float, optional): Maximum street price ceiling in ₹.
- `sort_by` (string, default: "relevance"): Sorting criteria (`relevance`, `price_asc`, `price_desc`, `rating_desc`).
- `in_stock_only` (bool, default: true): Exclude out-of-stock items.
- `limit` (int, default: 60, max: 250): Items per page.
- `offset` (int, default: 0): Pagination offset.

#### Successful Response (`200 OK`):
```json
{
  "total": 6,
  "limit": 60,
  "offset": 0,
  "categories": {
    "laptop": 41,
    "smartphone": 23,
    "audio": 10,
    "smartwatch": 10,
    "tablet": 9,
    "monitor": 8,
    "gaming": 6,
    "accessory": 6
  },
  "products": [
    {
      "id": "game_ps5_slim_disc",
      "name": "Sony PlayStation 5 Slim Disc Edition (1TB SSD)",
      "category": "gaming",
      "brand": "Sony",
      "price": 54990.0,
      "formatted_price": "₹54,990",
      "ram_gb": 16,
      "storage_gb": 1024,
      "processor": "Custom AMD Zen 2 8-Core (3.5GHz)",
      "gpu": "Custom AMD RDNA 2 (10.3 TFLOPS)",
      "rating": 4.9,
      "in_stock": true,
      "benchmarks": { ... },
      "price_signal": { ... }
    }
  ]
}
```

---

### 3. Side-by-Side Comparison Matrix
`POST /api/compare`

Compares 2 or 3 selected electronic products head-to-head.

#### Request Body (`application/json`):
```json
{
  "product_ids": [
    "laptop_macbook_air_m3",
    "laptop_lenovo_legion_pro_7i"
  ],
  "priority": "performance"
}
```

#### Successful Response (`200 OK`):
```json
{
  "priority_applied": "performance",
  "priority_winner_id": "laptop_lenovo_legion_pro_7i",
  "winner_reason": "Outperforms competitors with Intel Core i9-14900HX, RTX 4080 (175W TGP), and 32GB DDR5 RAM.",
  "products": [
    {
      "id": "laptop_macbook_air_m3",
      "name": "Apple MacBook Air 13\" (M3, 2024)",
      "is_winner": false,
      "formatted_price": "₹89,990",
      "benchmarks": { ... },
      "price_signal": { ... }
    },
    {
      "id": "laptop_lenovo_legion_pro_7i",
      "name": "Lenovo Legion Pro 7i (16\" Gen 9)",
      "is_winner": true,
      "formatted_price": "₹2,69,990",
      "benchmarks": { ... },
      "price_signal": { ... }
    }
  ]
}
```

---

### 4. Interactive AI Copilot
`POST /api/copilot`

Provides grounded hardware advice, conversational recommendations, and follow-up prompts.

#### Request Body (`application/json`):
```json
{
  "query": "Which of these has better cooling for long Python machine learning workloads in hot Indian summers?",
  "active_product_ids": [
    "laptop_macbook_air_m3",
    "laptop_lenovo_legion_pro_7i"
  ],
  "history": []
}
```

#### Successful Response (`200 OK`):
```json
{
  "reply": "For extended Python machine learning workloads running CUDA or PyTorch, the Lenovo Legion Pro 7i is significantly better suited due to its dual-channel Coldfront 5.0 vapor chamber cooling...",
  "relevant_products": [ ... ],
  "suggested_prompts": [
    "How does the battery life compare?",
    "Is 16GB RAM sufficient for Docker?",
    "What is the all-time low price for this model?"
  ]
}
```

---

## 🛠️ Admin & System Endpoints

### 5. Asynchronous CSV Catalog Upload
`POST /api/admin/catalog/upload`

Uploads and validates a batch CSV catalog in the background.

- **Headers**: `X-Admin-Key: <ADMIN_API_KEY>`
- **Body**: `multipart/form-data` with `file` field.

#### Response (`202 Accepted`):
```json
{
  "job_id": "job_9b3e10fa_20260921",
  "status": "processing",
  "filename": "laptops_update_q3.csv",
  "message": "CSV upload accepted. Processing rows in the background."
}
```

---

### 6. Query Upload Job Status
`GET /api/admin/catalog/upload/{job_id}`

- **Headers**: `X-Admin-Key: <ADMIN_API_KEY>`

#### Response (`200 OK`):
```json
{
  "job_id": "job_9b3e10fa_20260921",
  "status": "completed",
  "total_rows_processed": 113,
  "successful_rows": 111,
  "quarantined_rows": 2,
  "quarantine_report": [
    {
      "line_number": 42,
      "product_name": "Unknown Laptop",
      "error": "Missing required price or price not in INR."
    }
  ]
}
```

---

### 7. Force Vector Re-indexing
`POST /api/admin/catalog/reindex`

Regenerates 384-dimensional dense vector embeddings for all products in the database.

- **Headers**: `X-Admin-Key: <ADMIN_API_KEY>`

#### Response (`200 OK`):
```json
{
  "status": "success",
  "indexed_products_count": 113,
  "embedding_dimensions": 384,
  "message": "Catalog vector embeddings re-indexed successfully."
}
```

---

### 8. System Health Check
`GET /api/health`

Public liveness and database connection probe.

#### Response (`200 OK`):
```json
{
  "status": "healthy",
  "environment": "production",
  "catalog_size": 113,
  "database": "connected",
  "timestamp": "2026-09-21T23:45:00.000Z"
}
```
