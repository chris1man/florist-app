#!/bin/bash

# Fix Colors Script - Replace green colors with #E63A62 after build
echo "🎨 Fixing colors in built files..."

# Navigate to backend public directory
cd /root/florist-app/backend/public

echo "📄 Fixing HTML manifest link..."
# Fix manifest link in HTML
sed -i 's|href="/assets/manifest-[^"]*\.webmanifest"|href="/manifest.webmanifest"|g' index.html

echo "🔍 Checking for green/emerald colors in assets..."
# Find and replace green/emerald colors in CSS files

# Standard green colors
find assets/ -name "*.css" -exec sed -i 's/#10b981/#E63A62/g' {} \;
find assets/ -name "*.css" -exec sed -i 's/rgb(16,185,129)/rgb(230,58,98)/g' {} \;
find assets/ -name "*.css" -exec sed -i 's/rgb(16, 185, 129)/rgb(230, 58, 98)/g' {} \;

# Emerald colors from your examples
find assets/ -name "*.css" -exec sed -i 's/#020604/#E63A62/g' {} \;
find assets/ -name "*.css" -exec sed -i 's/rgb(160 185 129/rgb(230 58 98/g' {} \;
find assets/ -name "*.css" -exec sed -i 's/rgb(5 150 105/rgb(230 58 98/g' {} \;
find assets/ -name "*.css" -exec sed -i 's/#d1fae5/#E63A62/g' {} \;
find assets/ -name "*.css" -exec sed -i 's/#ecfdf5/#E63A62/g' {} \;

# Common emerald RGB variants
find assets/ -name "*.css" -exec sed -i 's/rgb(16 185 129/rgb(230 58 98/g' {} \;
find assets/ -name "*.css" -exec sed -i 's/rgb(6 95 70/rgb(230 58 98/g' {} \;
find assets/ -name "*.css" -exec sed -i 's/rgb(4 120 87/rgb(230 58 98/g' {} \;
find assets/ -name "*.css" -exec sed -i 's/rgb(34 197 94/rgb(230 58 98/g' {} \;

# Find and replace in JS files
find assets/ -name "*.js" -exec sed -i 's/#10b981/#E63A62/g' {} \;
find assets/ -name "*.js" -exec sed -i 's/rgb(16,185,129)/rgb(230,58,98)/g' {} \;
find assets/ -name "*.js" -exec sed -i 's/#020604/#E63A62/g' {} \;
find assets/ -name "*.js" -exec sed -i 's/rgb(160 185 129/rgb(230 58 98/g' {} \;
find assets/ -name "*.js" -exec sed -i 's/rgb(5 150 105/rgb(230 58 98/g' {} \;
find assets/ -name "*.js" -exec sed -i 's/#d1fae5/#E63A62/g' {} \;
find assets/ -name "*.js" -exec sed -i 's/#ecfdf5/#E63A62/g' {} \;

echo "🔧 Updating service worker cache version..."
# Update service worker cache version
TIMESTAMP=$(date +%s)
sed -i "s/florist-app-v[0-9]*/florist-app-v${TIMESTAMP}/g" sw.js

echo "✅ Color fix completed!"
echo "🌺 All colors should now be #E63A62"

# Show summary
echo ""
echo "📊 Summary:"
echo "- HTML manifest link: ✓ Fixed"
echo "- CSS color replacements: ✓ Done" 
echo "- JS color replacements: ✓ Done"
echo "- Service worker cache: ✓ Updated"
echo ""
echo "🚀 Ready to restart server with: pm2 restart all"