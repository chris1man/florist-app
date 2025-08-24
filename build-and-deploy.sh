#!/bin/bash

echo "🔧 Building Florist App with PWA and color fixes..."

# Navigate to frontend
cd /root/florist-app/frontend

echo "📦 Building frontend..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "📁 Copying files to backend..."
cp -r dist/* ../backend/public/

echo "🎨 Applying color fixes..."
cd /root/florist-app
./fix-colors.sh

echo "🔄 Restarting server..."
pm2 restart all

echo ""
echo "✅ Build and deployment completed successfully!"
echo ""
echo "🌐 Application available at: http://localhost:3000"
echo "📱 PWA colors: #E63A62 (pink theme)"
echo "🛠️  PWA install: Should work in Chrome/Edge"
echo ""
echo "📊 Quick checks:"
echo "- Theme color: $(curl -s http://localhost:3000 | grep -o 'theme-color.*#[^"]*' | head -1)"
echo "- Manifest: $(curl -s http://localhost:3000/manifest.webmanifest | grep -o 'theme_color[^,]*')"
echo "- Service Worker: $(curl -s http://localhost:3000/sw.js | head -1)"