import { NextResponse } from "next/server";
import { db, isDatabaseHealthy } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const isDatabaseDisabled = process.env.DISABLE_DATABASE === 'true';
    const database = db();

    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        isVercel: process.env.VERCEL_ENV || process.env.VERCEL === '1',
        isNetlify: process.env.NETLIFY === 'true',
        databaseDisabled: isDatabaseDisabled
      },
      database: {
        connected: isDatabaseDisabled ? "disabled" : (database !== null && isDatabaseHealthy()),
        mode: isDatabaseDisabled ? "static" : "dynamic"
      },
      features: {
        import: !isDatabaseDisabled,
        export: !isDatabaseDisabled,
        events: !isDatabaseDisabled,
        scraping: true // This can work without database
      }
    };

    return NextResponse.json(health);
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
