#!/bin/bash

# Exit on first error
set -e

echo "=== starting Duka Profit Deployment ==="

# 1. Fetch latest changes (uncomment if deploying from Git repository)
# echo "Fetching updates from Git..."
# git pull origin main

# 2. Build Frontend
echo "Building Frontend assets..."
cd frontend
# Install dependencies
npm install
# Compile Vite project for production
# CRITICAL: We set VITE_API_URL=/api so that the web client contacts the relative /api 
# path on the hosted domain rather than defaulting to http://localhost:5000
VITE_API_URL=/api npm run build
cd ..

# 3. Install Backend Production Dependencies
echo "Installing Backend dependencies..."
cd backend
npm install --production
cd ..

# 4. Process Manager PM2 configurations
if command -v pm2 &> /dev/null
then
    echo "PM2 found. Restarting backend application..."
    # Start or reload PM2 process
    pm2 startOrReload ecosystem.config.js --env production
    # Save PM2 process list to restore on reboot
    pm2 save
else
    echo "WARNING: PM2 is not installed. You can run the backend using: node backend/server.js"
    echo "To install PM2 globally, run: sudo npm install -g pm2"
fi

echo "=== Deployment Completed Successfully! ==="
echo "The backend Express server is running and serving built frontend assets."
