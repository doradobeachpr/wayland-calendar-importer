import { NextRequest, NextResponse } from "next/server";
import { EventService } from "@/lib/services/eventService";

export const dynamic = 'force-dynamic';

// GET /api/calendar-sources - Get all calendar sources
export async function GET() {
  try {
    // Initialize sources if needed
    await EventService.initializeCalendarSources();

    const sources = await EventService.getCalendarSources();

    return NextResponse.json({
      success: true,
      data: sources
    });

  } catch (error) {
    console.error("❌ Error getting calendar sources:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get calendar sources",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// PUT /api/calendar-sources - Update calendar source
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceId, ...updates } = body;

    if (!sourceId) {
      return NextResponse.json(
        { success: false, error: "Source ID is required" },
        { status: 400 }
      );
    }

    await EventService.updateCalendarSource(sourceId, updates);

    return NextResponse.json({
      success: true,
      message: "Calendar source updated successfully"
    });

  } catch (error) {
    console.error("❌ Error updating calendar source:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update calendar source",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
