import { NextResponse } from "next/server";
import { EventService } from "@/lib/services/eventService";
import { format, addDays, addWeeks } from "date-fns";

export const dynamic = 'force-dynamic';

// Sample events based on the real Wayland calendar structure we observed
const sampleEvents = [
  {
    title: "Design Review Advisory Board",
    description: "Monthly meeting of the Design Review Advisory Board to review proposed developments",
    startDate: "2025-08-01",
    startTime: "18:30",
    isAllDay: false,
    location: "Town Building",
    category: "meeting",
    department: "Design Review Advisory Board",
    url: "https://www.wayland.ma.us/design-review-advisory-board",
  },
  {
    title: "Recreation Commission",
    description: "Monthly Recreation Commission meeting",
    startDate: "2025-08-05",
    startTime: "10:30",
    isAllDay: false,
    location: "Recreation Office",
    category: "meeting",
    department: "Recreation Commission",
    url: "https://www.wayland.ma.us/recreation-commission",
  },
  {
    title: "Municipal Affordable Housing Trust",
    description: "Board meeting for the Municipal Affordable Housing Trust",
    startDate: "2025-08-05",
    startTime: "18:00",
    isAllDay: false,
    location: "Town Building - Conference Room",
    category: "meeting",
    department: "Municipal Affordable Housing Trust",
    url: "https://www.wayland.ma.us/municipal-affordable-housing-trust-fund-board",
  },
  {
    title: "Select Board Meeting",
    description: "Regular Select Board meeting to discuss town business",
    startDate: "2025-08-12",
    startTime: "18:30",
    isAllDay: false,
    location: "Town Building - Selectmen's Meeting Room",
    category: "meeting",
    department: "Select Board",
    url: "https://www.wayland.ma.us/select-board",
  },
  {
    title: "Conservation Commission",
    description: "Conservation Commission meeting",
    startDate: "2025-08-13",
    startTime: "18:30",
    isAllDay: false,
    location: "Town Building",
    category: "meeting",
    department: "Conservation Commission",
    url: "https://www.wayland.ma.us/conservation-commission",
  },
  {
    title: "Planning Board",
    description: "Regular Planning Board meeting",
    startDate: "2025-08-13",
    startTime: "19:00",
    isAllDay: false,
    location: "Town Building",
    category: "meeting",
    department: "Planning Board",
    url: "https://www.wayland.ma.us/planning-department-board",
  },
  {
    title: "Economic Development Committee",
    description: "Monthly Economic Development Committee meeting",
    startDate: "2025-08-14",
    startTime: "08:30",
    isAllDay: false,
    location: "Town Building",
    category: "meeting",
    department: "Economic Development Committee",
    url: "https://www.wayland.ma.us/economic-development-committee",
  },
  {
    title: "Board of Health",
    description: "Board of Health regular meeting",
    startDate: "2025-08-18",
    startTime: "18:30",
    isAllDay: false,
    location: "Town Building",
    category: "meeting",
    department: "Board of Health",
    url: "https://www.wayland.ma.us/board-health",
  },
  {
    title: "Finance Committee",
    description: "Finance Committee meeting",
    startDate: "2025-08-21",
    startTime: "19:00",
    isAllDay: false,
    location: "Town Building",
    category: "meeting",
    department: "Finance Committee",
    url: "https://www.wayland.ma.us/finance-committee",
  },
  {
    title: "Summer Concert Series",
    description: "Free outdoor concert featuring local musicians",
    startDate: "2025-08-22",
    startTime: "19:00",
    isAllDay: false,
    location: "Town Beach",
    category: "event",
    department: "Recreation Department",
    url: "https://www.wayland.ma.us/waylandrec",
  },
  {
    title: "Housing Authority Meeting",
    description: "Wayland Housing Authority board meeting",
    startDate: "2025-08-26",
    startTime: "18:30",
    isAllDay: false,
    location: "Housing Authority Office",
    category: "meeting",
    department: "Wayland Housing Authority",
    url: "https://www.wayland.ma.us/wayland-housing-authority",
  },
  {
    title: "Labor Day",
    description: "Federal holiday - Town offices closed",
    startDate: "2025-09-01",
    isAllDay: true,
    category: "holiday",
    department: "Town Clerk",
  },
  {
    title: "Energy and Climate Committee",
    description: "Monthly Energy and Climate Committee meeting",
    startDate: "2025-09-03",
    startTime: "16:30",
    isAllDay: false,
    location: "Town Building",
    category: "meeting",
    department: "Energy and Climate Committee",
    url: "https://www.wayland.ma.us/energy-and-climate-committee",
  },
  {
    title: "School Committee Meeting",
    description: "Regular School Committee meeting",
    startDate: "2025-09-09",
    startTime: "18:00",
    isAllDay: false,
    location: "Wayland High School",
    category: "meeting",
    department: "School Committee",
    url: "https://www.wayland.ma.us/school-committee",
  },
  {
    title: "Fall Town Meeting",
    description: "Annual Fall Town Meeting for all registered voters",
    startDate: "2025-10-28",
    startTime: "19:30",
    isAllDay: false,
    location: "Wayland High School Gymnasium",
    category: "meeting",
    department: "Town Clerk",
    url: "https://www.wayland.ma.us/town-meeting",
  },
];

// POST /api/seed-data - Add sample events to demonstrate functionality
export async function POST() {
  try {
    console.log("🌱 Seeding sample events...");

    let importedCount = 0;
    const errors: string[] = [];

    for (const eventData of sampleEvents) {
      try {
        const newEventData = {
          ...eventData,
          startDate: `${eventData.startDate}T${eventData.startTime || "00:00"}:00.000Z`,
          endDate: null,
          endTime: null,
          importedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await EventService.createEvent(newEventData);
        importedCount++;
        console.log(`✅ Added: ${eventData.title}`);
      } catch (error) {
        const errorMsg = `Failed to add event "${eventData.title}": ${error}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    console.log(`🌱 Seeding completed: ${importedCount} events added, ${errors.length} errors`);

    return NextResponse.json({
      success: true,
      message: "Sample events seeded successfully",
      data: {
        imported: importedCount,
        errors: errors.length,
        errorDetails: errors,
      },
    });

  } catch (error) {
    console.error("❌ Error seeding sample events:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to seed sample events",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// DELETE /api/seed-data - Clear all events (for testing)
export async function DELETE() {
  try {
    console.log("🗑️ Clearing all events...");

    // Note: This would need to be implemented in EventService
    // For now, return a message about manual cleanup

    return NextResponse.json({
      success: true,
      message: "Clear events endpoint - implementation pending",
      data: {
        message: "To clear events, manually delete the calendar.db file and restart the server"
      }
    });

  } catch (error) {
    console.error("❌ Error clearing events:", error);
    return NextResponse.json(
      { success: false, error: "Failed to clear events" },
      { status: 500 }
    );
  }
}
