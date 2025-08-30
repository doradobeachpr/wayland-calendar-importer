import { NextRequest, NextResponse } from "next/server";
import { EventService } from "../../../lib/services/eventService";
import { CalendarSource } from "../../../lib/db/schema";
import { format } from "date-fns";

export const dynamic = 'force-dynamic';

// POST /api/multi-source-import - Start multi-source import
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sources, month, year } = body;

    // Validate sources
    if (!sources || !Array.isArray(sources)) {
      return NextResponse.json(
        { success: false, error: "Sources array is required" },
        { status: 400 }
      );
    }

    // Validate source names
    const validSources = [
      "wayland-town",
      "tcan-events",
      "patch-community",
      "wayland-high-school",
      "wayland-wcpa",
      "town-planner",
      "arts-wayland",
      "wayland-high-athletics",
      "wayland-middle-athletics",
      "wayland-library"
    ];

    const invalidSources = sources.filter((source: string) => !validSources.includes(source));
    if (invalidSources.length > 0) {
      return NextResponse.json(
        { success: false, error: `Invalid sources: ${invalidSources.join(", ")}` },
        { status: 400 }
      );
    }

    // Calculate 90-day window from today
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    const endDate = new Date(today.getTime() + (90 * 24 * 60 * 60 * 1000)); // 90 days from today

    console.log(`🚀 Starting multi-source import for sources: ${sources.join(", ")} (${format(today, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')})`);

    // Initialize calendar sources if not already done
    await EventService.initializeCalendarSources();

    // Start the import with 90-day window
    const result = await EventService.importFromMultipleSources(
      sources as CalendarSource[],
      undefined,
      {
        dateRange: { startDate: today, endDate: endDate },
        // Keep month/year for backward compatibility
        month: month || format(today, "MM"),
        year: year || format(today, "yyyy")
      }
    );

    console.log(`✅ Multi-source import completed: Job ID ${result.jobId}`);

    return NextResponse.json({
      success: true,
      message: "Multi-source import completed",
      data: {
        jobId: result.jobId,
        totalEvents: result.results.totalEvents,
        totalSources: result.results.totalSources,
        successfulSources: result.results.successfulSources,
        results: result.results.results.map(r => ({
          source: r.source,
          eventsFound: r.events.length,
          errors: r.errors.length,
          warnings: r.warnings.length,
          url: r.metadata.url
        }))
      }
    });

  } catch (error) {
    console.error("❌ Error in multi-source import:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to import from multiple sources",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// GET /api/multi-source-import - Get import status or job history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (jobId) {
      // Get specific job
      const job = await EventService.getImportJob(parseInt(jobId));
      if (!job) {
        return NextResponse.json(
          { success: false, error: "Job not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          ...job,
          sources: JSON.parse(job.sources),
          errors: job.errors ? JSON.parse(job.errors) : [],
          warnings: job.warnings ? JSON.parse(job.warnings) : [],
          results: job.results ? JSON.parse(job.results) : null
        }
      });
    } else {
      // Get recent jobs
      const jobs = await EventService.getImportJobs(limit);

      return NextResponse.json({
        success: true,
        data: jobs.map(job => ({
          ...job,
          sources: JSON.parse(job.sources),
          errors: job.errors ? JSON.parse(job.errors) : [],
          warnings: job.warnings ? JSON.parse(job.warnings) : []
        }))
      });
    }

  } catch (error) {
    console.error("❌ Error getting import status:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get import status",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
