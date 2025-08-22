import { NextResponse } from "next/server";
import { EventService } from "@/lib/services/eventService";

export const dynamic = 'force-dynamic';

// POST /api/seed - Manually seed the database with sample data
export async function POST() {
  try {
    console.log("🌱 Starting database seeding...");

    // Initialize calendar sources and seed sample events
    await EventService.initializeCalendarSources();

    console.log("✅ Database seeding completed successfully");

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully with calendar sources and sample events"
    });

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to seed database",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// GET /api/seed - Check seeding status
export async function GET() {
  try {
    const stats = await EventService.getEventStats();

    return NextResponse.json({
      success: true,
      message: "Database status checked",
      data: {
        isSeeded: stats.totalEvents > 0,
        totalEvents: stats.totalEvents,
        totalSources: stats.sources.length
      }
    });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check database status",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
