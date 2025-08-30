import { NextRequest, NextResponse } from "next/server";
import { EventService } from "@/lib/services/eventService";

export const dynamic = 'force-dynamic';

// GET /api/events - Get all events with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || undefined;
    const category = searchParams.get('category') || undefined;
    const department = searchParams.get('department') || undefined;
    const calendarSource = searchParams.get('calendarSource') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    console.log(`📊 Fetching events: page=${page}, limit=${limit}, search=${search}, category=${category}, department=${department}, source=${calendarSource}, startDate=${startDate}, endDate=${endDate}`);

    const result = await EventService.getAllEvents(page, limit, {
      search,
      category,
      department,
      calendarSource,
      startDate,
      endDate
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error("❌ Error fetching events:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch events",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// POST /api/events - Create a new event
export async function POST(request: NextRequest) {
  try {
    const eventData = await request.json();

    console.log(`➕ Creating new event: ${eventData.title}`);

    const newEvent = await EventService.createEvent({
      ...eventData,
      importedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Event created successfully",
      data: newEvent
    });

  } catch (error) {
    console.error("❌ Error creating event:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create event",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// PUT /api/events - Update an event
export async function PUT(request: NextRequest) {
  try {
    const { id, ...eventData } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Event ID is required" },
        { status: 400 }
      );
    }

    console.log(`📝 Updating event: ${id}`);

    const updatedEvent = await EventService.updateEvent(id, {
      ...eventData,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Event updated successfully",
      data: updatedEvent
    });

  } catch (error) {
    console.error("❌ Error updating event:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update event",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// DELETE /api/events - Delete an event
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Event ID is required" },
        { status: 400 }
      );
    }

    console.log(`🗑️ Deleting event: ${id}`);

    await EventService.deleteEvent(parseInt(id));

    return NextResponse.json({
      success: true,
      message: "Event deleted successfully"
    });

  } catch (error) {
    console.error("❌ Error deleting event:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete event",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
