#!/usr/bin/env bash
set -e

# Resolve repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/frontend"

echo "========================================================"
echo " Starting SpecDiff React Frontend (Port 5173)..."
echo "========================================================"

if [ ! -d "node_modules" ]; then
    echo "node_modules not found. Running npm install..."
    npm install
fi

npm run dev
