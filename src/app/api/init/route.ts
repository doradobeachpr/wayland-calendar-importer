import { NextResponse } from "next/server";
import { EventService } from "@/lib/services/eventService";
import { ensureInitialized } from "@/lib/db";

export const dynamic = 'force-dynamic';

// POST /api/init - Initialize database and seed sources
export async function POST() {
  try {
    console.log("🔧 Initializing database and seeding sources...");

    // Ensure database is initialized
    ensureInitialized();

    // Initialize calendar sources and seed sample events
    await EventService.initializeCalendarSources();

    // Get stats to verify initialization
    const stats = await EventService.getEventStats();
    const sources = await EventService.getCalendarSources();

    console.log("✅ Database initialization completed successfully");

    return NextResponse.json({
      success: true,
      message: "Database initialized and sources seeded successfully",
      data: {
        totalEvents: stats.totalEvents,
        totalSources: sources.length,
        categories: stats.categories.length,
        sources: sources.map(s => ({
          id: s.id,
          displayName: s.displayName,
          isActive: s.isActive
        }))
      }
    });

  } catch (error) {
    console.error("❌ Error initializing database:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize database",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// GET /api/init - Check initialization status
export async function GET() {
  try {
    ensureInitialized();

    const stats = await EventService.getEventStats();
    const sources = await EventService.getCalendarSources();

    return NextResponse.json({
      success: true,
      message: "Database status checked",
      data: {
        isInitialized: sources.length > 0,
        totalEvents: stats.totalEvents,
        totalSources: sources.length,
        sources: sources.map(s => ({
          id: s.id,
          displayName: s.displayName,
          isActive: s.isActive,
          totalEvents: s.totalEvents || 0
        }))
      }
    });

  } catch (error) {
    console.error("❌ Error checking database status:", error);
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
