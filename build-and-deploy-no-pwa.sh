#!/bin/bash

echo "🔧 Building Florist App WITHOUT PWA (Service Worker disabled)..."

# Navigate to frontend
cd /root/florist-app/frontend

echo "🧹 Cleaning cache and dist..."
rm -rf dist
rm -rf node_modules/.vite

echo "📦 Building frontend (no PWA plugin)..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "📁 Copying files to backend..."
rm -rf ../backend/public/assets
cp -r dist/* ../backend/public/

echo "🔄 Restarting server..."
cd /root/florist-app/backend
pm2 restart florist-backend

echo ""
echo "✅ Build and deployment completed successfully!"
echo ""
echo "🌐 Application available at: http://localhost:3000"
echo "🎨 Theme color: #E63A62 (pink theme)"
echo "🚫 PWA: Service Worker DISABLED"
echo ""
echo "📊 Quick checks:"
echo "- App status: $(pm2 status | grep florist-backend | awk '{print $6}')"
echo "- Theme color: $(curl -s http://localhost:3000 | grep -o 'theme-color.*#[^"]*' | head -1)"
echo "- PWA tags: $(curl -s http://localhost:3000 | grep -i "service\|pwa\|manifest\|registerSW" | wc -l | tr -d ' ') found"
echo "- Assets loaded: $(curl -s http://localhost:3000 | grep -E "(script|link.*assets)" | wc -l | tr -d ' ') files"
echo ""
echo "🔍 PWA Status: DISABLED"
echo "   - No Service Worker"
echo "   - No PWA installation"
echo "   - No offline functionality"
echo "   - Simple web app mode"
