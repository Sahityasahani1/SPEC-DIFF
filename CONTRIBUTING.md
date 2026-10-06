# Contributing to SpecDiff

Thank you for your interest in contributing to **SpecDiff**! Whether you are adding new verified Indian hardware models, enhancing the 3D WebGL visualizers, optimizing the vector retrieval engine, or fixing bugs, we welcome your contributions.

---

## 🧭 Code of Conduct

All contributors and participants are expected to adhere to standard respectful, professional conduct. Treat all community members with empathy, respect, and constructive collaboration.

---

## 🛠️ Local Development Setup

### 1. Fork & Clone the Repository
```bash
git clone https://github.com/your-username/SPEC-DIFF.git
cd SPEC-DIFF
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
python data/seed_expanded_catalog.py
uvicorn app.main:app --reload
```

### 3. Frontend Setup
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```

---

## 🌿 Git Branching & Workflow

1. Create a feature branch with a descriptive prefix:
   - `feature/instant-search-filters`
   - `fix/battery-calculation-interpolation`
   - `perf/vector-indexing-speed`
   - `docs/api-specification-update`

```bash
git checkout -b feature/your-feature-name
```

2. Make clean, atomic commits following the [Conventional Commits](https://www.conventionalcommits.org/) format:
   - `feat: add dual-screen OLED laptop benchmark profile`
   - `fix: correct Rupee symbol formatting in comparison export`
   - `perf: optimize HNSW cosine distance lookup`
   - `test: add golden scenario for UPSC aspirant persona`

---

## 🧪 Quality Standards & Verification

Before submitting any Pull Request, you must verify that all automated tests and build checks pass without warnings or errors.

### 1. Backend Verification
Run the complete Pytest suite from the `backend/` directory:
```bash
cd backend
pytest -v
```
- **Requirement**: All 41 tests must pass with `0 warnings`.

### 2. Frontend Build Verification
Run the production Vite build from the `frontend/` directory:
```bash
cd frontend
npm run build
```
- **Requirement**: Zero TypeScript/ESLint/Vite compilation errors.

---

## 📝 Pull Request Checklist

When submitting a Pull Request:
- [ ] Ensure all commits are descriptive and follow conventional commit guidelines.
- [ ] Add new unit tests in `backend/tests/` for any new routers, services, or constraint invariants.
- [ ] If adding new products to `seed_expanded_catalog.py`, ensure all specs (RAM, storage, processor, display, price in ₹) are factual and verified against Indian retailers.
- [ ] Confirm `pytest -v` passes with 0 warnings.
- [ ] Confirm `npm run build` succeeds without errors.
- [ ] Provide a clear summary and screenshots (if making UI/3D changes) in your PR description.
