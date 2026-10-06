#!/usr/bin/env bash
set -e

# Resolve repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/backend"

echo "========================================================"
echo " Starting SpecDiff FastAPI Backend (Port 8000)..."
echo "========================================================"

# Activate virtualenv (handles Windows Git Bash and Linux/macOS/WSL)
if [ -f "venv/Scripts/activate" ]; then
    source venv/Scripts/activate
elif [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
else
    echo "Virtual environment 'venv' not found. Creating one..."
    python3 -m venv venv 2>/dev/null || python -m venv venv
    if [ -f "venv/Scripts/activate" ]; then
        source venv/Scripts/activate
    else
        source venv/bin/activate
    fi
    pip install -r requirements.txt
fi

uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
