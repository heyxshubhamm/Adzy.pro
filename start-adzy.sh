#!/bin/bash

# Adzy Unified Launcher 🚀

echo "Starting Adzy Ecosystem... 🏆"

# Start FastAPI Backend
echo "🚀 Launching Python FastAPI Backend on port 8000..."
cd backend && ./venv/bin/python run.py &

# Start Next.js Frontend
echo "🚀 Launching Next.js Frontend on port 3000..."
cd .. && npm run dev &

echo "✨ All systems operational!"
echo "👉 Frontend: http://localhost:3000"
echo "👉 Backend API: http://localhost:8000"
echo "👉 Swagger Docs: http://localhost:8000/docs"

wait
