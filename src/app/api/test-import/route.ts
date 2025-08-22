import { NextResponse } from "next/server";
import { EventService } from "@/lib/services/eventService";

export const dynamic = 'force-dynamic';

// GET /api/test-import - Test calendar import for July 2025
export async function GET() {
  try {
    console.log("🧪 Starting test import for July 2025...");

    const results = await EventService.importCalendarMonth("07", "2025");

    console.log("🧪 Test import completed:", results);

    return NextResponse.json({
      success: true,
      message: "Test import completed",
      data: results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("❌ Test import failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Test import failed",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
