# Netlify Deployment Guide for Next.js 15 App Router

## Issues Fixed

### 1. Plugin Configuration
- **Problem**: `@netlify/plugin-nextjs` was in `devDependencies`
- **Fix**: Moved to `dependencies` so Netlify can access it during build

### 2. Node.js Version
- **Problem**: No Node.js version specified
- **Fix**: Added `NODE_VERSION = "20"` in `netlify.toml`

### 3. Next.js 15 Configuration
- **Problem**: Invalid experimental configuration options
- **Fix**: Cleaned up `next.config.js` to use only valid Next.js 15 options

### 4. Environment Variables
- **Problem**: No production environment configuration
- **Fix**: Added `.env.production` with Netlify-specific settings

## Files Modified

### `package.json`
```json
{
  "dependencies": {
    "@netlify/plugin-nextjs": "^5.12.0"
    // ... other dependencies
  }
}
```

### `netlify.toml`
```toml
[build]
  command = "bun run build"

[build.environment]
  NODE_VERSION = "20"
  NETLIFY = "true"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

### `next.config.js`
- Removed deprecated experimental options
- Clean configuration for Next.js 15
- Proper serverExternalPackages for SQLite

### `.env.production`
```env
NODE_ENV=production
NETLIFY=true
DATABASE_URL=/tmp/.netlify/calendar.db
```

## API Route Structure

All API routes follow Next.js 15 App Router structure:
```
src/app/api/
  ├── test/route.ts          # Simple test endpoint
  ├── health/route.ts        # Health check with debugging
  ├── events/route.ts        # Events API
  └── ...other routes/
```

Each route has:
- `export const dynamic = 'force-dynamic'` - Forces dynamic rendering
- `export const runtime = 'nodejs'` - Explicit runtime declaration
- Proper error handling for Netlify environment

## Testing API Routes

### Local Testing
```bash
# Build and test locally
bun run build
bun run start

# Test individual routes
curl http://localhost:3000/api/test
curl http://localhost:3000/api/health
```

### Netlify Testing
After deployment, test:
```bash
curl https://your-site.netlify.app/api/test
curl https://your-site.netlify.app/api/health
```

## Deployment Steps

1. **Connect Repository**
   - Link your GitHub repository to Netlify
   - Netlify will automatically detect `netlify.toml`

2. **Environment Variables**
   - Set any required environment variables in Netlify dashboard
   - Production variables will override `.env.production`

3. **Deploy**
   - Push changes to trigger automatic deployment
   - Monitor build logs for any issues

## Debugging Netlify Issues

### Build Logs
Check Netlify build logs for:
- Node.js version being used
- Plugin installation success
- Next.js build output showing dynamic routes

### Function Logs
Monitor Netlify function logs to see:
- API route execution
- Error messages
- Performance metrics

### Test Endpoints
Use the `/api/test` endpoint to verify:
- Basic functionality
- Netlify environment detection
- Runtime configuration

## Common Issues & Solutions

### 404 on API Routes
- Ensure all routes have `export const dynamic = 'force-dynamic'`
- Check that `@netlify/plugin-nextjs` is in dependencies
- Verify build logs show routes being created as functions

### Database Errors
- SQLite databases need special handling on Netlify
- Use `/tmp/.netlify/` path for temporary storage
- Consider alternative databases for production

### Build Failures
- Check Node.js version compatibility
- Ensure all dependencies are properly installed
- Review TypeScript compilation errors

## Performance Optimization

### Cold Starts
- Keep dependencies minimal
- Use proper error handling
- Consider database connection pooling

### Response Times
- Cache static data where possible
- Use appropriate HTTP headers
- Monitor function execution times

## Support Resources

- [Netlify Next.js Plugin Docs](https://docs.netlify.com/integrations/frameworks/next-js/)
- [Next.js 15 App Router Docs](https://nextjs.org/docs/app)
- [Netlify Functions Docs](https://docs.netlify.com/functions/overview/)
