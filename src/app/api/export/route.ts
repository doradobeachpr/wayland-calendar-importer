import { NextRequest, NextResponse } from "next/server";
import { EventService } from "@/lib/services/eventService";
import { ExportService } from "@/lib/services/exportService";
import { format as formatDate } from "date-fns";

export const dynamic = 'force-dynamic';

// GET /api/export?format=csv|ical&search=&category=&department=&calendarSource=
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");
    const search = searchParams.get("search") || undefined;
    const category = searchParams.get("category") || undefined;
    const department = searchParams.get("department") || undefined;
    const calendarSource = searchParams.get("calendarSource") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    if (!format || !["csv", "ical"].includes(format)) {
      return NextResponse.json(
        { success: false, error: "Invalid format. Use 'csv' or 'ical'" },
        { status: 400 }
      );
    }

    console.log(`📤 Exporting events as ${format}: search=${search}, category=${category}, department=${department}, source=${calendarSource}, startDate=${startDate}, endDate=${endDate}`);

    // Get all events with filters (using large limit to get all matching events)
    const result = await EventService.getAllEvents(1, 10000, {
      search,
      category,
      department,
      calendarSource,
      startDate,
      endDate
    });

    const events = result.events;

    console.log(`📊 Found ${events.length} events to export`);

    // Generate export content
    let content: string;
    let mimeType: string;
    let filename: string;
    const dateStr = formatDate(new Date(), "yyyy-MM-dd");

    if (format === "csv") {
      content = ExportService.exportToCSV(events);
      mimeType = "text/csv";
      filename = `wayland-events-${dateStr}.csv`;
    } else {
      content = ExportService.exportToICal(events);
      mimeType = "text/calendar";
      filename = `wayland-events-${dateStr}.ics`;
    }

    console.log(`✅ Generated ${format.toUpperCase()} export with ${events.length} events`);

    // Return file as download
    return new NextResponse(content, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });

  } catch (error) {
    console.error("❌ Error exporting events:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to export events",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
