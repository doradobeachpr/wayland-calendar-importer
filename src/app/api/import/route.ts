import { NextRequest, NextResponse } from "next/server";
import { EventService } from "@/lib/services/eventService";
import { format } from "date-fns";

export const dynamic = 'force-dynamic';

// Store for SSE connections (in production, use Redis or similar)
const sseConnections = new Map<string, (data: Record<string, unknown>) => void>();

// POST /api/import - Import calendar data from Wayland website with real-time progress
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { month, year, sessionId } = body;

    // Calculate 90-day window from today
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    const endDate = new Date(today.getTime() + (90 * 24 * 60 * 60 * 1000)); // 90 days from today

    console.log(`🚀 Starting import for 90-day window: ${format(today, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);

    // Progress callback for real-time updates
    const progressCallback = sessionId ? (progress: { currentSource?: string; processed: number; total: number; status: string; errors: string[]; warnings: string[] }) => {
      const sendProgress = sseConnections.get(sessionId);
      if (sendProgress) {
        sendProgress({
          type: 'progress',
          data: progress
        });
      }
    } : undefined;

    // Use the new multi-source import method with 90-day date range
    const importResult = await EventService.importFromMultipleSources(
      ["wayland-town"], // Default to Wayland town for legacy compatibility
      progressCallback,
      {
        dateRange: { startDate: today, endDate: endDate },
        // Keep month/year for backward compatibility with older scrapers
        month: month || format(today, "MM"),
        year: year || format(today, "yyyy")
      }
    );

    const results = {
      imported: importResult.results.totalEvents,
      updated: 0,
      errors: importResult.results.globalErrors,
      warnings: [],
      metadata: {}
    };

    // Send completion event
    if (sessionId) {
      const sendProgress = sseConnections.get(sessionId);
      if (sendProgress) {
        sendProgress({
          type: 'complete',
          data: results
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        dateRange: {
          startDate: format(today, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd')
        },
        windowDays: 90,
        ...results,
      },
    });

  } catch (error) {
    console.error("❌ Error importing calendar:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to import calendar",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// GET /api/import/progress - Server-Sent Events for real-time progress
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
  }

  // Set up SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Set up the SSE connection
      const sendData = (data: Record<string, unknown>) => {
        const sseData = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(sseData));
      };

      // Store the connection
      sseConnections.set(sessionId, sendData);

      // Send initial connection message
      sendData({ type: 'connected', message: 'Progress stream connected' });

      // Clean up after 5 minutes
      setTimeout(() => {
        sseConnections.delete(sessionId);
        controller.close();
      }, 5 * 60 * 1000);
    },

    cancel() {
      sseConnections.delete(sessionId);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}
