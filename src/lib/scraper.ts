import * as cheerio from "cheerio";
import { format, parse, parseISO } from "date-fns";
import { NewEvent } from "./db/schema";

export interface ScrapedEvent {
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  isAllDay: boolean;
  location?: string;
  category?: string;
  department?: string;
  url?: string;
  sourceId?: string;
}

export interface ScrapingResult {
  events: ScrapedEvent[];
  errors: string[];
  warnings: string[];
  metadata: {
    url: string;
    scrapedAt: string;
    totalEventsFound: number;
    successfullyParsed: number;
  };
}

export async function scrapeWaylandCalendar(month?: string, year?: string): Promise<ScrapingResult> {
  const result: ScrapingResult = {
    events: [],
    errors: [],
    warnings: [],
    metadata: {
      url: "",
      scrapedAt: new Date().toISOString(),
      totalEventsFound: 0,
      successfullyParsed: 0,
    },
  };

  try {
    // Build URL for specific month/year or current month
    const baseUrl = "https://www.wayland.ma.us/calendar";
    const currentDate = new Date();
    const targetMonth = month || format(currentDate, "MM");
    const targetYear = year || format(currentDate, "yyyy");

    const url = `${baseUrl}/month/${targetYear}-${targetMonth.padStart(2, "0")}`;
    result.metadata.url = url;

    console.log(`🔍 Scraping calendar from: ${url}`);

    // Try direct fetch first
    let html: string;
    try {
      html = await fetchCalendarPage(url);
    } catch (error) {
      if (error instanceof Error && error.message.includes("403")) {
        console.log("⚠️ Direct fetch blocked, trying fallback scraping method...");
        result.warnings.push("Direct fetch blocked by website, using alternative method");

        // For now, return a structured result indicating we need alternative scraping
        result.warnings.push("Fallback scraping not yet implemented - manual testing required");
        console.log("💡 Suggestion: Test import functionality through the UI or implement alternative scraping method");
        return result;
      }
      throw error;
    }

    console.log(`📄 Retrieved HTML content (${html.length} characters)`);

    if (html.length < 1000) {
      result.warnings.push("Retrieved HTML seems unusually short, may indicate a problem");
    }

    const $ = cheerio.load(html);

    // Try multiple parsing strategies
    const events = await parseCalendarWithMultipleStrategies($, targetYear, targetMonth, result);

    result.events = events;
    result.metadata.totalEventsFound = events.length;
    result.metadata.successfullyParsed = events.filter(e => e.title && e.startDate).length;

    console.log(`✅ Scraping completed: ${result.metadata.successfullyParsed}/${result.metadata.totalEventsFound} events parsed successfully`);

    if (result.errors.length > 0) {
      console.warn(`⚠️ ${result.errors.length} errors encountered during scraping`);
    }

    return result;

  } catch (error) {
    const errorMessage = `Fatal error scraping calendar: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`❌ ${errorMessage}`);
    result.errors.push(errorMessage);
    return result;
  }
}

async function fetchCalendarPage(url: string): Promise<string> {
  // Add a small delay to avoid being too aggressive
  await new Promise(resolve => setTimeout(resolve, 1000));

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
      "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"macOS"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.text();
}

async function parseCalendarWithMultipleStrategies(
  $: cheerio.CheerioAPI,
  targetYear: string,
  targetMonth: string,
  result: ScrapingResult
): Promise<ScrapedEvent[]> {
  const events: ScrapedEvent[] = [];

  // Strategy 1: Look for standard calendar table structure
  console.log("🔍 Trying Strategy 1: Standard calendar table...");
  const strategy1Events = parseStandardCalendarTable($, targetYear, targetMonth, result);
  events.push(...strategy1Events);

  // Strategy 2: Look for calendar grid/div structure
  console.log("🔍 Trying Strategy 2: Calendar grid structure...");
  const strategy2Events = parseCalendarGrid($, targetYear, targetMonth, result);
  events.push(...strategy2Events);

  // Strategy 3: Look for list-based events
  console.log("🔍 Trying Strategy 3: Event list structure...");
  const strategy3Events = parseEventList($, targetYear, targetMonth, result);
  events.push(...strategy3Events);

  // Remove duplicates based on title and date
  const uniqueEvents = removeDuplicateEvents(events, result);

  console.log(`📊 Parsing strategies found: ${strategy1Events.length} + ${strategy2Events.length} + ${strategy3Events.length} = ${events.length} events, ${uniqueEvents.length} unique`);

  return uniqueEvents;
}

function parseStandardCalendarTable(
  $: cheerio.CheerioAPI,
  targetYear: string,
  targetMonth: string,
  result: ScrapingResult
): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];

  try {
    // Look for calendar table
    const calendarTable = $("table.calendar-month, .calendar-table, table").first();

    if (calendarTable.length === 0) {
      result.warnings.push("No calendar table found for standard parsing");
      return events;
    }

    console.log("📅 Found calendar table, parsing cells...");

    calendarTable.find("td").each((_, cell) => {
      const $cell = $(cell);

      // Skip header cells
      if ($cell.hasClass("day-name") || $cell.find("th").length > 0) return;

      // Try multiple ways to find the day number
      const dayNumberElement = $cell.find("strong, .day-number, .date").first();
      let dayText = dayNumberElement.text().trim();

      if (!dayText) {
        // Fallback: try to get first number in cell
        const cellText = $cell.text().trim();
        const dayMatch = cellText.match(/^\d{1,2}/);
        dayText = dayMatch ? dayMatch[0] : "";
      }

      const dayNumber = parseInt(dayText);
      if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > 31) return;

      const cellDate = new Date(parseInt(targetYear), parseInt(targetMonth) - 1, dayNumber);

      // Find all event links and text in this cell
      const cellEvents = extractEventsFromCell($, $cell, cellDate, result);
      events.push(...cellEvents);
    });

  } catch (error) {
    result.errors.push(`Error in standard table parsing: ${error}`);
  }

  return events;
}

function parseCalendarGrid(
  $: cheerio.CheerioAPI,
  targetYear: string,
  targetMonth: string,
  result: ScrapingResult
): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];

  try {
    // Look for calendar grid structure
    const gridSelectors = [
      ".calendar-grid .day",
      ".calendar .day-cell",
      ".month-calendar .calendar-day",
      "[data-date]",
      ".day-container"
    ];

    for (const selector of gridSelectors) {
      const dayCells = $(selector);
      if (dayCells.length > 0) {
        console.log(`📅 Found ${dayCells.length} day cells with selector: ${selector}`);

        dayCells.each((_, cell) => {
          const $cell = $(cell);
          const dateAttr = $cell.attr("data-date");

          let cellDate: Date;
          if (dateAttr) {
            try {
              cellDate = new Date(dateAttr);
            } catch {
              return; // Skip invalid dates
            }
          } else {
            // Try to extract date from cell content
            const dayMatch = $cell.text().match(/\b(\d{1,2})\b/);
            if (!dayMatch) return;

            const dayNumber = parseInt(dayMatch[1]);
            cellDate = new Date(parseInt(targetYear), parseInt(targetMonth) - 1, dayNumber);
          }

          const cellEvents = extractEventsFromCell($, $cell, cellDate, result);
          events.push(...cellEvents);
        });

        break; // Use the first successful selector
      }
    }

  } catch (error) {
    result.errors.push(`Error in grid parsing: ${error}`);
  }

  return events;
}

function parseEventList(
  $: cheerio.CheerioAPI,
  targetYear: string,
  targetMonth: string,
  result: ScrapingResult
): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];

  try {
    // Look for event lists
    const eventListSelectors = [
      ".event-list .event",
      ".calendar-events .event-item",
      ".events-listing .event",
      "[class*='event']"
    ];

    for (const selector of eventListSelectors) {
      const eventElements = $(selector);
      if (eventElements.length > 0) {
        console.log(`📋 Found ${eventElements.length} events in list with selector: ${selector}`);

        eventElements.each((_, element) => {
          const $element = $(element);

          try {
            const event = parseEventElement($element, targetYear, targetMonth);
            if (event) {
              events.push(event);
            }
          } catch (error) {
            result.warnings.push(`Failed to parse event element: ${error}`);
          }
        });

        break; // Use the first successful selector
      }
    }

  } catch (error) {
    result.errors.push(`Error in event list parsing: ${error}`);
  }

  return events;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractEventsFromCell($: cheerio.CheerioAPI, $cell: any, cellDate: Date, result: ScrapingResult): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];

  try {
    // Find all event links
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $cell.find("a[href*='/events/'], a[href*='/home/events/']").each((_: number, eventElement: any) => {
      const $event = $(eventElement);
      const eventText = $event.text().trim();
      const eventHref = $event.attr("href");

      if (!eventText) return;

      const event = parseEventFromText(eventText, eventHref, cellDate);
      if (event) {
        events.push(event);
      }
    });

    // Also look for non-link events
    const cellContent = $cell.clone();
    cellContent.find("a").remove(); // Remove links to see remaining text
    const remainingText = cellContent.text().trim();

    if (remainingText) {
      const lines = remainingText.split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line && !/^\d{1,2}$/.test(line)); // Filter out standalone day numbers

      lines.forEach((line: string) => {
        if (line.length > 3) { // Minimum event title length
          const event = parseEventFromText(line, undefined, cellDate);
          if (event) {
            events.push(event);
          }
        }
      });
    }

  } catch (error) {
    result.warnings.push(`Error extracting events from cell: ${error}`);
  }

  return events;
}

function parseEventFromText(eventText: string, eventHref: string | undefined, cellDate: Date): ScrapedEvent | null {
  try {
    // Parse event text to extract time and title
    const timeMatch = eventText.match(/(\d{1,2}:\d{2}(?:am|pm)?)/i);
    const time = timeMatch ? timeMatch[1] : undefined;

    // Clean up title by removing time and extra whitespace
    let title = eventText;
    if (time) {
      title = title.replace(time, "").trim();
    }
    title = title.replace(/\s+/g, " ").trim();

    if (!title || title.length < 2) {
      return null;
    }

    // Determine if it's an all-day event
    const isAllDay = !time || eventText.toLowerCase().includes("all day");

    // Extract department/category from link or title
    let department: string | undefined;
    let category: string | undefined;

    if (eventHref && eventHref.includes("/")) {
      const urlParts = eventHref.split("/");
      const departmentIndex = urlParts.findIndex(part => part === "events");
      if (departmentIndex > 0) {
        const departmentSlug = urlParts[departmentIndex - 1];
        if (departmentSlug && departmentSlug !== "home") {
          department = departmentSlug.replace(/-/g, " ");
        }
      }
    }

    // Categorize events based on title and department
    const titleLower = title.toLowerCase();
    if (titleLower.includes("board") ||
        titleLower.includes("committee") ||
        titleLower.includes("commission") ||
        titleLower.includes("meeting")) {
      category = "meeting";
    } else if (titleLower.includes("holiday") ||
               titleLower.includes("day") ||
               titleLower.includes("independence") ||
               titleLower.includes("memorial") ||
               titleLower.includes("labor")) {
      category = "holiday";
    } else {
      category = "event";
    }

    const event: ScrapedEvent = {
      title: title,
      startDate: format(cellDate, "yyyy-MM-dd"),
      startTime: time ? convertTo24Hour(time) : undefined,
      isAllDay,
      department,
      category,
      url: eventHref ? `https://www.wayland.ma.us${eventHref}` : undefined,
      sourceId: eventHref ? eventHref.split("/").pop() : undefined,
    };

    return event;

  } catch (error) {
    console.warn(`Failed to parse event text "${eventText}":`, error);
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseEventElement($element: any, targetYear: string, targetMonth: string): ScrapedEvent | null {
  try {
    const title = $element.find(".event-title, .title, h3, h4").text().trim() || $element.text().trim();
    const dateText = $element.find(".event-date, .date").text().trim();
    const timeText = $element.find(".event-time, .time").text().trim();
    const locationText = $element.find(".event-location, .location").text().trim();
    const descriptionText = $element.find(".event-description, .description").text().trim();

    if (!title) return null;

    // Try to parse date
    let eventDate: Date;
    if (dateText) {
      try {
        eventDate = new Date(dateText);
      } catch {
        // Fallback to current month
        eventDate = new Date(parseInt(targetYear), parseInt(targetMonth) - 1, 1);
      }
    } else {
      eventDate = new Date(parseInt(targetYear), parseInt(targetMonth) - 1, 1);
    }

    const isAllDay = !timeText || timeText.toLowerCase().includes("all day");

    return {
      title,
      description: descriptionText || undefined,
      startDate: format(eventDate, "yyyy-MM-dd"),
      startTime: timeText ? convertTo24Hour(timeText) : undefined,
      isAllDay,
      location: locationText || undefined,
      category: "event",
    };

  } catch (error) {
    console.warn("Failed to parse event element:", error);
    return null;
  }
}

function removeDuplicateEvents(events: ScrapedEvent[], result: ScrapingResult): ScrapedEvent[] {
  const seen = new Set<string>();
  const unique: ScrapedEvent[] = [];

  for (const event of events) {
    const key = `${event.title}|${event.startDate}|${event.startTime || 'no-time'}`;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(event);
    } else {
      result.warnings.push(`Duplicate event filtered: ${event.title} on ${event.startDate}`);
    }
  }

  return unique;
}

function convertTo24Hour(time: string): string {
  try {
    // Parse various time formats and convert to 24-hour HH:MM format
    const timeStr = time.toLowerCase().trim();

    if (timeStr.includes("am") || timeStr.includes("pm")) {
      const parsed = parse(timeStr, "h:mma", new Date());
      return format(parsed, "HH:mm");
    } else if (timeStr.includes(":")) {
      // Assume it's already in 24-hour format
      return timeStr.padStart(5, "0");
    } else {
      // Single number, assume hour
      const hour = parseInt(timeStr);
      return `${hour.toString().padStart(2, "0")}:00`;
    }
  } catch (error) {
    console.warn(`Failed to parse time: ${time}`);
    return time;
  }
}

export function convertScrapedToNewEvent(scraped: ScrapedEvent): NewEvent {
  const now = new Date().toISOString();

  return {
    title: scraped.title,
    description: scraped.description || null,
    startDate: `${scraped.startDate}T${scraped.startTime || "00:00"}:00.000Z`,
    endDate: scraped.endDate ? `${scraped.endDate}T${scraped.endTime || "23:59"}:00.000Z` : null,
    startTime: scraped.startTime || null,
    endTime: scraped.endTime || null,
    isAllDay: scraped.isAllDay,
    location: scraped.location || null,
    category: scraped.category || null,
    department: scraped.department || null,
    url: scraped.url || null,
    sourceId: scraped.sourceId || null,
    importedAt: now,
    updatedAt: now,
  };
}
