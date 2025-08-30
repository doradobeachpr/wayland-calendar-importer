/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["*.preview.same-app.com"],

  // Optimize for serverless deployment (Vercel/Netlify)
  serverExternalPackages: ['better-sqlite3'],


  // Ensure proper API route handling
  typescript: {
    ignoreBuildErrors: false,
  },

  images: {
    unoptimized: true,
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
