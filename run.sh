#!/usr/bin/env bash

# Function to clean up background jobs on exit
cleanup() {
    echo ""
    echo "Stopping all SpecDiff services..."
    kill $(jobs -p) 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================================"
echo " Starting SpecDiff Platform (Backend + Frontend)..."
echo "========================================================"

# --- 1. Start Backend ---
cd "$SCRIPT_DIR/backend"
if [ -f "venv/Scripts/activate" ]; then
    source venv/Scripts/activate
elif [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
else
    echo "[Backend] Virtual environment not found. Creating venv..."
    python3 -m venv venv 2>/dev/null || python -m venv venv
    if [ -f "venv/Scripts/activate" ]; then
        source venv/Scripts/activate
    else
        source venv/bin/activate
    fi
    pip install -r requirements.txt
fi

echo "[Backend] Starting FastAPI on http://127.0.0.1:8000..."
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

# --- 2. Start Frontend ---
cd "$SCRIPT_DIR/frontend"
if [ ! -d "node_modules" ]; then
    echo "[Frontend] Running npm install..."
    npm install
fi

echo "[Frontend] Starting Vite on http://localhost:5173..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================================"
echo " ✅ Both services are running!"
echo " - Backend API:  http://127.0.0.1:8000 (Swagger: /docs)"
echo " - Frontend UI:  http://localhost:5173"
echo " Press Ctrl+C in this terminal to stop both servers."
echo "========================================================"
echo ""

wait
