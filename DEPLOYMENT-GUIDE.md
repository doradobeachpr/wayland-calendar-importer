# 🚀 Deployment Guide for Wayland Calendar Importer

This Next.js application is ready for deployment with multiple platform options. The local build is working perfectly with database fallback mode.

## ✅ Current Status
- **Local Build**: ✅ Working with `DISABLE_DATABASE=true NODE_ENV=production bun run build`
- **GitHub Repo**: https://github.com/doradobeachpr/wayland-calendar-importer
- **Latest Commit**: 14da9c9 - "Add GitHub Actions workflow for Vercel deployment"
- **Configuration**: ✅ vercel.json and netlify.toml properly configured

## 🎯 Quick Deploy Options

### Option 1: Vercel (Recommended)

#### Method A: Import from GitHub (Easiest)
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project" → "Import Git Repository"  
3. Enter: https://github.com/doradobeachpr/wayland-calendar-importer
4. Configure these environment variables:
   ```
   DISABLE_DATABASE=true
   NODE_ENV=production
   VERCEL_ENV=production
   ```
5. Deploy! The vercel.json is already configured with the correct build command.

### Option 2: Netlify
1. Go to [netlify.com](https://netlify.com) and sign in
2. Click "New site from Git" → Connect to GitHub
3. Select: doradobeachpr/wayland-calendar-importer
4. Build settings (auto-detected from netlify.toml):
   ```
   Build command: bun run build
   Publish directory: .next
   ```
5. Add environment variables:
   ```
   DISABLE_DATABASE=true
   NODE_ENV=production
   NETLIFY=true
   ```

## 📱 Features Available in Database Fallback Mode
- ✅ Calendar viewing interface
- ✅ Web scraping functionality  
- ✅ Export capabilities (ICS, CSV)
- ✅ Import from multiple sources
- ✅ Real-time event processing
- ❌ Data persistence (events reset on restart)

