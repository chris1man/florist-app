#!/bin/bash

echo "⚡ Quick build Florist App (no PWA)..."

# Navigate to frontend
cd /root/florist-app/frontend

echo "🧹 Cleaning dist..."
rm -rf dist

echo "📦 Building frontend..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "📁 Copying to backend..."
rm -rf ../backend/public/assets
cp -r dist/* ../backend/public/

echo "🔄 Restarting backend..."
cd /root/florist-app/backend
pm2 restart florist-backend

echo "✅ Quick build completed!"
echo "🌐 App available at: http://localhost:3000"
