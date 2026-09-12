#!/bin/bash
# ──────────────────────────────────────────────────────────────────
# Resumeit ML Backend Launcher
# Run from the Hirelens_v1_abhy project root:
#   chmod +x backend/start.sh && ./backend/start.sh
# ──────────────────────────────────────────────────────────────────

set -e

BACKEND_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV="$BACKEND_DIR/venv"

if [ ! -d "$VENV" ]; then
  echo "🔧 Creating virtual environment..."
  python3 -m venv "$VENV"
fi

source "$VENV/bin/activate"

echo "📦 Checking dependencies..."
pip install -q -r "$BACKEND_DIR/requirements.txt" 2>/dev/null || true

# Train model if not already trained
MODEL="$BACKEND_DIR/models/ats_model.pkl"
if [ ! -f "$MODEL" ]; then
  echo "🧠 Training ATS model for the first time..."
  cd "$BACKEND_DIR" && python train.py
fi

echo ""
echo "✅ Resumeit ML Backend starting at http://localhost:8000"
echo "   Health check → http://localhost:8000/health"
echo "   Press Ctrl+C to stop."
echo ""

cd "$BACKEND_DIR" && uvicorn main:app --host 0.0.0.0 --port 8000 --reload
