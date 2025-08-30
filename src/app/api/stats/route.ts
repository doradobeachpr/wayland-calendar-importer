import { NextResponse } from "next/server";
import { EventService } from "@/lib/services/eventService";

export const dynamic = 'force-dynamic';

// GET /api/stats - Get event statistics
export async function GET() {
  try {
    const stats = await EventService.getEventStats();

    return NextResponse.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch statistics"
      },
      { status: 500 }
    );
  }
}
