import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/test - Simple test endpoint with Netlify debugging
export async function GET() {
  const isNetlify = process.env.NETLIFY === 'true';
  const functionPath = process.env.AWS_LAMBDA_FUNCTION_NAME || 'local';

  return NextResponse.json({
    success: true,
    message: "API routes are working!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "unknown",
    netlify: isNetlify,
    functionPath,
    runtime: 'nodejs',
    version: '1.0.0'
  });
}

// POST /api/test - Test POST endpoint
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    return NextResponse.json({
      success: true,
      message: "POST endpoint working!",
      timestamp: new Date().toISOString(),
      receivedBody: body,
      netlify: process.env.NETLIFY === 'true'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "POST endpoint error",
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
