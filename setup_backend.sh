#!/bin/bash

echo "========================================"
echo " Self-Checkout Backend Setup Script"
echo "========================================"
echo

echo "[1/4] Navigating to backend directory..."
cd backend

echo "[2/4] Installing Node.js dependencies..."
npm install

echo "[3/4] Initializing database..."
npm run init-db

echo "[4/4] Starting the server..."
echo
echo "========================================"
echo " Backend Setup Complete!"
echo "========================================"
echo
echo "Server will start on: http://localhost:3000"
echo "API Base URL: http://localhost:3000/api"
echo "Health Check: http://localhost:3000/api/health"
echo
echo "Press Ctrl+C to stop the server"
echo

npm run dev


