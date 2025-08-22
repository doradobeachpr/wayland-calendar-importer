import ical from "ical-generator";
import Papa from "papaparse";
import { Event } from "../db/schema";
import { format } from "date-fns";

export class ExportService {
  static exportToCSV(events: Event[]): string {
    const csvData = events.map(event => ({
      Title: event.title,
      Description: event.description || "",
      "Start Date": format(new Date(event.startDate), "yyyy-MM-dd"),
      "Start Time": event.startTime || "",
      "End Date": event.endDate ? format(new Date(event.endDate), "yyyy-MM-dd") : "",
      "End Time": event.endTime || "",
      "All Day": event.isAllDay ? "Yes" : "No",
      Location: event.location || "",
      Category: event.category || "",
      Department: event.department || "",
      URL: event.url || "",
      "Imported At": format(new Date(event.importedAt), "yyyy-MM-dd HH:mm:ss"),
    }));

    return Papa.unparse(csvData);
  }

  static exportToICal(events: Event[]): string {
    const calendar = ical({
      name: "Wayland Calendar Events",
      description: "Events imported from Wayland, MA calendar",
      timezone: "America/New_York",
    });

    events.forEach(event => {
      try {
        const startDate = new Date(event.startDate);
        let endDate: Date;

        if (event.endDate) {
          endDate = new Date(event.endDate);
        } else if (event.isAllDay) {
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 1);
        } else {
          endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 1);
        }

        // Adjust times if specified
        if (event.startTime && !event.isAllDay) {
          const [hours, minutes] = event.startTime.split(":").map(Number);
          startDate.setHours(hours, minutes);
        }

        if (event.endTime && !event.isAllDay) {
          const [hours, minutes] = event.endTime.split(":").map(Number);
          endDate.setHours(hours, minutes);
        }

        calendar.createEvent({
          start: startDate,
          end: endDate,
          summary: event.title,
          description: event.description || undefined,
          location: event.location || undefined,
          url: event.url || undefined,
          allDay: event.isAllDay || false,
          organizer: {
            name: event.department || "Town of Wayland",
            email: "info@wayland.ma.us"
          },
          categories: event.category ? [{ name: event.category }] : undefined,
        });
      } catch (error) {
        console.warn(`Failed to add event to calendar: ${event.title}`, error);
      }
    });

    return calendar.toString();
  }

  static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  static exportEventsAsCSV(events: Event[], filename?: string): void {
    const csv = this.exportToCSV(events);
    const defaultFilename = `wayland-events-${format(new Date(), "yyyy-MM-dd")}.csv`;
    this.downloadFile(csv, filename || defaultFilename, "text/csv");
  }

  static exportEventsAsICal(events: Event[], filename?: string): void {
    const ical = this.exportToICal(events);
    const defaultFilename = `wayland-events-${format(new Date(), "yyyy-MM-dd")}.ics`;
    this.downloadFile(ical, filename || defaultFilename, "text/calendar");
  }
}
