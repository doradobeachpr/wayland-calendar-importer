#!/bin/bash

# Vercel deployment script with multiple strategies
set -e

echo "🚀 Starting Vercel deployment process..."

# Function to deploy with database disabled (static mode)
deploy_static() {
  echo "📦 Deploying as static site (no database features)..."
  export DISABLE_DATABASE=true
  export NODE_ENV=production

  # Build the project
  echo "🔨 Building project in static mode..."
  bun run build

  # Deploy to Vercel
  echo "☁️  Deploying to Vercel..."
  npx vercel --prod --env DISABLE_DATABASE=true --env NODE_ENV=production
}

# Function to deploy with database (dynamic mode)
deploy_dynamic() {
  echo "🗄️ Deploying with database features (may fail on Vercel)..."
  export NODE_ENV=production

  # Build the project
  echo "🔨 Building project in dynamic mode..."
  bun run build

  # Deploy to Vercel
  echo "☁️  Deploying to Vercel..."
  npx vercel --prod --env NODE_ENV=production
}

# Function to test local build
test_build() {
  echo "🧪 Testing local build..."
  export NODE_ENV=production
  bun run build
  echo "✅ Local build successful"
}

# Main deployment logic
case "${1:-auto}" in
  "static")
    deploy_static
    ;;
  "dynamic")
    deploy_dynamic
    ;;
  "test")
    test_build
    ;;
  "auto"|*)
    echo "🤖 Auto-detecting best deployment strategy..."

    # First try dynamic deployment
    echo "🔄 Attempting dynamic deployment first..."
    if deploy_dynamic; then
      echo "✅ Dynamic deployment successful!"
    else
      echo "⚠️  Dynamic deployment failed, falling back to static mode..."
      deploy_static
    fi
    ;;
esac

echo "🎉 Deployment process completed!"
