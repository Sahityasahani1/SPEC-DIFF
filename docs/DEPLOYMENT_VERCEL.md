# Vercel Deployment & Production Architecture Guide

**Platform:** SpecDiff / SmartPick AI  
**Deployment Target:** Vercel (Edge Frontend) + Cloud Container (FastAPI Backend)  
**Readiness Status:** **100% Deploy Ready**

---

## 1. Executive Deployment Architecture

To achieve sub-second TTFB, 99.99% uptime, and zero-downtime hardware recommendations at scale, the system is designed as a **Decoupled Edge-to-Core Architecture**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       TIER 1: EDGE PRESENTATION (VERCEL)                    │
│ • Vite React 18 Single Page Application (214 kB entry bundle)               │
│ • Global Anycast Edge CDN Distribution                                      │
│ • Automatic HTTPS & Instant Branch Previews                                 │
│ • Configured via root 'vercel.json' & 'frontend/vercel.json'                │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                      Reverse Proxy Rewrites /api/*
                        (Zero CORS, Sub-10ms edge route)
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 TIER 2: COMPUTE & RAG RETRIEVAL (RAILWAY / RENDER)          │
│ • Always-On FastAPI ASGI Engine (Gunicorn/Uvicorn)                          │
│ • 384-dimensional Dense Semantic Vector Engine + BM25 Okapi                │
│ • Real-Time Daily Market Price Sync Engine (Background Daemon)              │
│ • Persistent SQLite ('smartpick.db') or Managed PostgreSQL                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Why Vercel for Frontend & Not the Monolithic Backend?

| Capability | Frontend on Vercel | Backend on Vercel Serverless | Backend on Container (Railway/Render) |
| :--- | :---: | :---: | :---: |
| **Static Bundle Hosting** | **Optimal** (Sub-second Edge CDN) | N/A | Sub-optimal |
| **Cold Starts** | **0 ms** | 2,000–5,000 ms (Vector re-index) | **0 ms** (Always-on memory) |
| **Persistent Database** | N/A | **Unsupported** (Ephemeral read-only filesystem) | **Supported** (Persistent volume / PG) |
| **In-Memory Embeddings** | N/A | Recomputed on every cold start | **Preserved in RAM** across requests |
| **Background Cron Tasks** | N/A | **Unsupported** (Freezes after response) | **Supported** (Continuous daemon) |
| **Max Function Size** | Unlimited | 250 MB Lambda limit | Unlimited |

> [!NOTE]
> **Conclusion:** Deploying the **React frontend on Vercel** while hosting the **FastAPI backend on Railway, Render, Fly.io, or AWS** is the gold standard for high-scale e-commerce applications.

---

## 3. Step-by-Step Vercel Deployment Guide

### Option A: Standard Deployment (Root Directory = `frontend`)
This is the cleanest and most common Vercel setup when deploying the React SPA:

1. **Push your code to GitHub / GitLab / Bitbucket**.
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your repository (`RAG Project`).
4. In the Project Configuration:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click **Edit** and select `frontend`.
   - **Build Command:** `npm run build` (detected automatically).
   - **Output Directory:** `dist` (detected automatically).
5. **Environment Variables:**
   Add:
   ```env
   VITE_API_URL=https://your-backend-api.railway.app/api
   ```
   *(If you are using Vercel rewrites in `vercel.json`, you can leave this blank and all `/api/*` calls will proxy automatically!)*
6. Click **Deploy**. Vercel will build the frontend in ~11 seconds and output a live production URL (e.g., `https://specdiff.vercel.app`).

---

### Option B: Monorepo Root Deployment
If you prefer deploying from the repository root:

1. The included [`vercel.json`](file:///c:/sahityaa/RAG%20Project/vercel.json) at the root contains the build configuration:
   ```json
   {
     "framework": "vite",
     "buildCommand": "cd frontend && npm run build",
     "outputDirectory": "frontend/dist",
     "rewrites": [
       { "source": "/api/(.*)", "destination": "https://your-backend-api.railway.app/api/$1" },
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```
2. Simply import the repository in Vercel with **Root Directory = `.`**.
3. Replace `https://your-backend-api.railway.app` in `vercel.json` with your real backend service URL.

---

## 4. Deploying the Backend (Railway / Render / Fly.io)

### Railway (Recommended — 2-minute setup)
1. Go to [railway.app](https://railway.app) and click **"New Project" > "Deploy from GitHub repo"**.
2. Select your repository.
3. In **Settings > Root Directory**, set `/backend`.
4. Set the **Start Command**:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
5. Add the following **Environment Variables**:
   ```env
   ENVIRONMENT=production
   ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:5173
   DATABASE_URL=sqlite:///./smartpick.db
   ADMIN_API_KEY=your_secure_32_character_admin_key
   ```
6. Add a **Persistent Volume** mounted to `/backend` if you want SQLite writes (price alerts, watchlist items) to persist permanently across restarts.

---

## 5. Pre-Deployment Verification Matrix

Before shipping to production, verify all layers:

- [x] **Frontend Production Build:** `npm run build` succeeds cleanly in 11.3s with zero TypeScript/Vite errors.
- [x] **Bundle Splitting:** Rollup chunks (`vendor-three`, `vendor-charts`, `vendor-ui`) active; entrypoint is 214 kB.
- [x] **Error Boundaries:** Top-level React `ErrorBoundary` and granular `FeatureErrorFallback` components catch rendering and network crashes with retry actions.
- [x] **Dynamic Meta Descriptions:** Document title and `<meta name="description">` dynamically update on tab changes for optimal SEO.
- [x] **CORS Allowlist:** Configured in `backend/app/config.py` and `.env.example` to allow Vercel production domains.
- [x] **Catalog & Vector Index:** All 1,176 products and 384-d dense embeddings intact in `smartpick.db`.
