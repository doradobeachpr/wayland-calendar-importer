import { NextRequest } from "next/server";
import { EventService } from "@/lib/services/eventService";
import { CalendarSource } from "@/lib/db/schema";

export const dynamic = 'force-dynamic';

// GET /api/multi-source-import-sse - Server-Sent Events for real-time import progress
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sourcesParam = searchParams.get('sources');
  const month = searchParams.get('month') || undefined;
  const year = searchParams.get('year') || undefined;

  if (!sourcesParam) {
    return new Response('Sources parameter is required', { status: 400 });
  }

  let sources: CalendarSource[];
  try {
    sources = JSON.parse(sourcesParam);
  } catch (error) {
    return new Response('Invalid sources format', { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const initialData = `data: ${JSON.stringify({
        type: 'status',
        message: 'Connected to import stream',
        processed: 0,
        total: sources.length
      })}\n\n`;
      controller.enqueue(encoder.encode(initialData));
    },

    async pull(controller) {
      try {
        console.log(`🚀 Starting SSE multi-source import for sources: ${sources.join(", ")}`);

        // Initialize calendar sources
        await EventService.initializeCalendarSources();

        // Start the import with progress callback
        const result = await EventService.importFromMultipleSources(
          sources,
          (progress) => {
            // Send progress update via SSE
            const progressData = `data: ${JSON.stringify({
              type: 'progress',
              currentSource: progress.currentSource,
              processed: progress.processed,
              total: progress.total,
              status: progress.status,
              errors: progress.errors,
              warnings: progress.warnings
            })}\n\n`;

            try {
              controller.enqueue(encoder.encode(progressData));
            } catch (error) {
              console.warn('Failed to send progress update:', error);
            }
          },
          { month, year }
        );

        // Send final completion message
        const completionData = `data: ${JSON.stringify({
          type: 'complete',
          jobId: result.jobId,
          totalEvents: result.results.totalEvents,
          totalSources: result.results.totalSources,
          successfulSources: result.results.successfulSources,
          globalErrors: result.results.globalErrors,
          results: result.results.results.map(r => ({
            source: r.source,
            eventsFound: r.events.length,
            errors: r.errors.length,
            warnings: r.warnings.length,
            url: r.metadata.url
          }))
        })}\n\n`;

        controller.enqueue(encoder.encode(completionData));

        // Close the stream
        controller.close();

      } catch (error) {
        console.error("❌ Error in SSE multi-source import:", error);

        // Send error message
        const errorData = `data: ${JSON.stringify({
          type: 'error',
          error: 'Import failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        })}\n\n`;

        controller.enqueue(encoder.encode(errorData));
        controller.close();
      }
    },

    cancel() {
      console.log('SSE stream cancelled');
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}
