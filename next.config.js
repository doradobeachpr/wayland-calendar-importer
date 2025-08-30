/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["*.preview.same-app.com"],
  // Optimize for serverless deployment (Vercel/Netlify)
  serverExternalPackages: ['better-sqlite3'],
  // Disable static export for now to support API routes on Vercel
  // output: process.env.DISABLE_DATABASE === 'true' ? 'export' : undefined,
  // trailingSlash: process.env.DISABLE_DATABASE === 'true',
  // Ensure proper API route handling
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true, // Required for static export and better Vercel compatibility
    domains: [
      "source.unsplash.com",
      "images.unsplash.com",
      "ext.same-assets.com",
      "ugc.same-assets.com",
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "source.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ext.same-assets.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ugc.same-assets.com",
        pathname: "/**",
      },
    ],
  },
  // Environment variables are handled automatically by Next.js
  env: {
    NETLIFY_ENV: process.env.NETLIFY || 'false',
    VERCEL_ENV: process.env.VERCEL_ENV || 'false',
  },
};

module.exports = nextConfig;
