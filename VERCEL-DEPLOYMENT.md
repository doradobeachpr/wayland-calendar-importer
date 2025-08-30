# Vercel Deployment Guide

This guide covers deploying the Wayland Calendar Importer to Vercel after resolving database compatibility issues.

## Problem Identified

The original deployment failed because:
1. **SQLite incompatibility**: Vercel's serverless functions don't support file-based databases like SQLite
2. **Incorrect vercel.json**: The configuration was using legacy settings
3. **Missing fallback mode**: No graceful degradation when database is unavailable

## Solution Implemented

### 1. Database Fallback Mode
- Added `DISABLE_DATABASE=true` environment variable support
- Database functions return `null` when disabled, triggering fallback behavior
- API routes handle database-free scenarios gracefully

### 2. Simplified vercel.json
```json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "VERCEL_ENV": "production",
    "NODE_ENV": "production",
    "DISABLE_DATABASE": "true"
  }
}
```

### 3. Updated next.config.js
- Optimized images for Vercel compatibility
- Added serverless package externalization
- Removed static export conflicts with API routes

## Deployment Options

### Option 1: Database-Free Deployment (Recommended for Vercel)

**Features Available:**
- ✅ Web scraping (calendar sources can still be scraped)
- ✅ Calendar display (with fallback data)
- ✅ Health checks
- ❌ Data persistence (events aren't saved)
- ❌ Import history
- ❌ Scheduled imports

**Deploy:**
```bash
# Option 1: Use the deployment script
./deploy-vercel.sh static

# Option 2: Manual deployment
DISABLE_DATABASE=true bun run build
vercel --prod --env DISABLE_DATABASE=true
```

### Option 2: Alternative Database Solutions

For full functionality on Vercel, consider migrating to:

1. **Vercel Postgres** (Recommended)
   ```bash
   npm install @vercel/postgres
   ```

2. **PlanetScale** (MySQL)
   ```bash
   npm install @planetscale/database
   ```

3. **Neon** (PostgreSQL)
   ```bash
   npm install @neondatabase/serverless
   ```

## Deployment Steps

1. **Install Vercel CLI** (if not already done):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy with database disabled**:
   ```bash
   cd wayland-calendar-importer
   ./deploy-vercel.sh static
   ```

4. **Alternative: Manual deployment**:
   ```bash
   DISABLE_DATABASE=true bun run build
   vercel --prod
   ```

## Environment Variables for Vercel

Set these in your Vercel dashboard or via CLI:

```bash
vercel env add DISABLE_DATABASE production
# Enter: true

vercel env add NODE_ENV production
# Enter: production

vercel env add VERCEL_ENV production
# Enter: production
```

## Testing Deployment

After deployment, test these endpoints:

1. **Health Check**: `https://your-app.vercel.app/api/health`
   - Should show `"database": { "mode": "static" }`

2. **Home Page**: `https://your-app.vercel.app/`
   - Should load without database errors

3. **Demo Page**: `https://your-app.vercel.app/demo`
   - Should work with fallback data

## Troubleshooting

### Build Errors
- Ensure `DISABLE_DATABASE=true` is set during build
- Check that all imports are properly typed for nullable database

### Runtime Errors
- Check Vercel function logs in dashboard
- Verify environment variables are set correctly
- Ensure API routes handle null database gracefully

### Performance Issues
- Monitor function execution time (30s max)
- Consider implementing caching for scraping results
- Optimize bundle size if needed

## Migration Path to Full Database

To restore full functionality:

1. Choose a cloud database provider
2. Update database connection in `src/lib/db/index.ts`
3. Remove `DISABLE_DATABASE` environment variable
4. Redeploy with database support

## Files Modified

- `vercel.json` - Simplified configuration
- `next.config.js` - Vercel optimizations
- `src/lib/db/index.ts` - Added fallback mode
- `src/app/api/health/route.ts` - Database-aware health checks
- `deploy-vercel.sh` - Deployment automation script

## Success Indicators

✅ Build completes without errors
✅ Vercel deployment succeeds
✅ Health endpoint returns 200
✅ Main page loads without crashes
✅ Scraping features work (without persistence)
