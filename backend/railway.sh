#!/bin/bash
# ── Railway Production Entry Point ──
# Ensures spaCy models and ML binaries are ready on the server

# 1. Install spaCy model if missing
python -m spacy download en_core_web_sm

# 2. Check if model exists, if not, train it
if [ ! -f "models/ats_model.pkl" ]; then
  echo "🧠 No model found. Training production engine..."
  python train.py
fi

# 3. Start the production server
echo "🚀 Starting Resumeeit ML Engine on Port ${PORT:-8000}"
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:${PORT:-8000}
