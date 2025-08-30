import { db, ensureInitialized, isDatabaseHealthy } from "../db";
import { events, calendarSourcesTable, importJobs, type Event, type NewEvent, type CalendarSourceRecord, type NewCalendarSource, type ImportJob, type NewImportJob, type CalendarSource, type EnhancedScrapedEvent } from "../db/schema";
import { eq, like, and, sql, desc } from "drizzle-orm";
import { MultiSourceScraper, type BulkScrapingResult } from "../scrapers/multiSourceScraper";

export interface ImportProgress {
  currentSource?: string;
  processed: number;
  total: number;
  status: string;
  errors: string[];
  warnings: string[];
}

export type ProgressCallback = (progress: ImportProgress) => void;

// Fallback data for when database is unavailable
const FALLBACK_SOURCES: CalendarSourceRecord[] = [
  {
    id: "wayland-town",
    name: "wayland-town",
    displayName: "Town of Wayland",
    url: "https://www.wayland.ma.us/calendar",
    description: "Official Town of Wayland calendar with municipal meetings and events",
    isActive: true,
    totalEvents: 8,
    successfulImports: 0,
    lastScraped: null,
    createdAt: "2025-08-01T12:00:00.000Z",
    updatedAt: "2025-08-01T12:00:00.000Z",
  },
  {
    id: "tcan-events",
    name: "tcan-events",
    displayName: "TCAN Events",
    url: "https://tcan.org/events/",
    description: "The Center for Arts in Natick - concerts, performances, and cultural events",
    isActive: true,
    totalEvents: 12,
    successfulImports: 0,
    lastScraped: null,
    createdAt: "2025-08-01T12:00:00.000Z",
    updatedAt: "2025-08-01T12:00:00.000Z",
  },
  {
    id: "wayland-library",
    name: "wayland-library",
    displayName: "Wayland Library",
    url: "https://waylandlibrary.org/events/",
    description: "Wayland Free Public Library programs and events",
    isActive: true,
    totalEvents: 6,
    successfulImports: 0,
    lastScraped: null,
    createdAt: "2025-08-01T12:00:00.000Z",
    updatedAt: "2025-08-01T12:00:00.000Z",
  },
  {
    id: "wayland-high-athletics",
    name: "wayland-high-athletics",
    displayName: "Wayland High Athletics",
    url: "https://arbiterlive.com/School/Calendar/24991",
    description: "Wayland High School sports and athletics calendar",
    isActive: true,
    totalEvents: 15,
    successfulImports: 0,
    lastScraped: null,
    createdAt: "2025-08-01T12:00:00.000Z",
    updatedAt: "2025-08-01T12:00:00.000Z",
  },
  {
    id: "arts-wayland",
    name: "arts-wayland",
    displayName: "Arts Wayland",
    url: "https://artswayland.com/pages/calendar",
    description: "Arts exhibitions, workshops, and cultural programming",
    isActive: true,
    totalEvents: 7,
    successfulImports: 0,
    lastScraped: null,
    createdAt: "2025-08-01T12:00:00.000Z",
    updatedAt: "2025-08-01T12:00:00.000Z",
  },
  {
    id: "wayland-wcpa",
    name: "wayland-wcpa",
    displayName: "Wayland WCPA",
    url: "https://waylandwcpa.org/events",
    description: "Wayland Children and Parents Association family events",
    isActive: true,
    totalEvents: 5,
    successfulImports: 0,
    lastScraped: null,
    createdAt: "2025-08-01T12:00:00.000Z",
    updatedAt: "2025-08-01T12:00:00.000Z",
  },
  {
    id: "town-planner",
    name: "town-planner",
    displayName: "Town Planner",
    url: "https://www.townplanner.com/wayland/ma/",
    description: "Comprehensive local event listings for Wayland area",
    isActive: true,
    totalEvents: 4,
    successfulImports: 0,
    lastScraped: null,
    createdAt: "2025-08-01T12:00:00.000Z",
    updatedAt: "2025-08-01T12:00:00.000Z",
  },
  {
    id: "wayland-high-school",
    name: "wayland-high-school",
    displayName: "Wayland High School",
    url: "https://whs.wayland.k12.ma.us/calendar",
    description: "Wayland High School academic and athletic events",
    isActive: true,
    totalEvents: 3,
    successfulImports: 0,
    lastScraped: null,
    createdAt: "2025-08-01T12:00:00.000Z",
    updatedAt: "2025-08-01T12:00:00.000Z",
  },
  {
    id: "wayland-middle-athletics",
    name: "wayland-middle-athletics",
    displayName: "Wayland Middle Athletics",
    url: "https://arbiterlive.com/School/Calendar/24992",
    description: "Wayland Middle School sports and athletics calendar",
    isActive: true,
    totalEvents: 4,
    successfulImports: 0,
    lastScraped: null,
    createdAt: "2025-08-01T12:00:00.000Z",
    updatedAt: "2025-08-01T12:00:00.000Z",
  },
  {
    id: "patch-community",
    name: "patch-community",
    displayName: "Patch Community",
    url: "https://patch.com/massachusetts/wayland/calendar",
    description: "Community events and local happenings from Patch",
    isActive: true,
    totalEvents: 3,
    successfulImports: 0,
    lastScraped: null,
    createdAt: "2025-08-01T12:00:00.000Z",
    updatedAt: "2025-08-01T12:00:00.000Z",
  }
];

const FALLBACK_EVENTS: Event[] = [
  {
    id: 1,
    title: "Board of Selectmen Meeting",
    description: "Regular meeting of the Board of Selectmen",
    startDate: "2025-08-05T19:00:00.000Z",
    endDate: null,
    startTime: "19:00",
    endTime: null,
    isAllDay: false,
    location: "Wayland Town Building - Selectmen's Room",
    category: "meeting",
    department: "selectmen",
    url: null,
    sourceId: null,
    calendarSource: "wayland-town",
    originalId: null,
    imageUrl: null,
    price: null,
    registrationUrl: null,
    contactInfo: null,
    tags: null,
    venue: "Wayland Town Building",
    organizerName: "Town of Wayland",
    organizerEmail: null,
    organizerPhone: null,
    importedAt: "2025-08-01T12:00:00.000Z",
    updatedAt: "2025-08-01T12:00:00.000Z",
    lastVerified: null,
    verificationStatus: "pending"
  },
  // ... additional fallback events would go here
];

export class EventService {
  // Database health check wrapper
  private static async withDatabaseFallback<T>(
    operation: () => Promise<T>,
    fallback: T,
    operationName: string
  ): Promise<T> {
    try {
      // Check if database is available
      const dbConnection = db();
      if (!dbConnection) {
        console.warn(`${operationName}: Database unavailable, using fallback`);
        return fallback;
      }

      // Check database health
      if (!isDatabaseHealthy()) {
        console.warn(`${operationName}: Database unhealthy, using fallback`);
        return fallback;
      }

      return await operation();
    } catch (error) {
      console.warn(`${operationName}: Database operation failed, using fallback:`, error);
      return fallback;
    }
  }

  // Safe database getter with type assertion
  private static getDb() {
    const dbConnection = db();
    if (!dbConnection) {
      throw new Error('Database connection not available');
    }
    return dbConnection;
  }

  // Safe database operation wrapper
  private static async safeDbOperation<T>(operation: () => Promise<T>): Promise<T> {
    const dbConnection = db();
    if (!dbConnection) {
      throw new Error('Database connection not available');
    }
    return await operation();
  }

  // Initialize calendar sources and sample data
  static async initializeCalendarSources(): Promise<void> {
    return this.withDatabaseFallback(
      async () => {
        ensureInitialized();
        console.log("🔧 Initializing calendar sources...");

        const sources: NewCalendarSource[] = FALLBACK_SOURCES.map(source => ({
          id: source.id,
          name: source.name,
          displayName: source.displayName,
          url: source.url,
          description: source.description,
          isActive: source.isActive,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));

        for (const source of sources) {
          try {
            await this.safeDbOperation(() =>
              this.getDb().insert(calendarSourcesTable).values(source).onConflictDoNothing()
            );
            console.log(`✅ Initialized source: ${source.displayName}`);
          } catch (error) {
            console.warn(`Failed to initialize source ${source.id}:`, error);
          }
        }

        console.log(`✅ Calendar sources initialization completed (${sources.length} sources)`);

        // Seed sample events for demonstration
        await this.seedSampleEvents();
      },
      undefined,
      "initializeCalendarSources"
    );
  }

  // Seed sample events for demonstration
  static async seedSampleEvents(): Promise<void> {
    return this.withDatabaseFallback(
      async () => {
        // Check if we already have events
        const existingEvents = await this.safeDbOperation(() =>
          this.getDb().select().from(events).limit(1)
        );
        if (existingEvents.length > 0) {
          return; // Already have events, don't seed again
        }

        const now = new Date().toISOString();
        const sampleEvents: NewEvent[] = [
          {
            title: "Town Meeting",
            description: "Monthly town meeting for municipal business",
            startDate: "2025-08-15T19:00:00.000Z",
            startTime: "19:00",
            isAllDay: false,
            location: "Wayland Town Building",
            category: "government",
            department: "town-clerk",
            calendarSource: "wayland-town",
            venue: "Wayland Town Building",
            organizerName: "Town of Wayland",
            importedAt: now,
            updatedAt: now,
          },
          // ... other sample events would go here
        ];

        for (const event of sampleEvents) {
          await this.safeDbOperation(() =>
            this.getDb().insert(events).values(event).onConflictDoNothing()
          );
        }

        console.log("✅ Sample events seeded successfully");
      },
      undefined,
      "seedSampleEvents"
    );
  }

  // Get all calendar sources
  static async getCalendarSources(): Promise<CalendarSourceRecord[]> {
    return this.withDatabaseFallback(
      async () => {
        ensureInitialized();

        try {
          // Try to get existing sources
          const existingSources = await this.safeDbOperation(() =>
            this.getDb().select().from(calendarSourcesTable).orderBy(calendarSourcesTable.displayName)
          );

          // If we have sources, return them
          if (existingSources.length > 0) {
            return existingSources;
          }

          // If no sources exist, initialize them
          console.log("No calendar sources found, initializing...");
          await this.initializeCalendarSources();

          // Try again to get sources
          return await this.safeDbOperation(() =>
            this.getDb().select().from(calendarSourcesTable).orderBy(calendarSourcesTable.displayName)
          );

        } catch (error) {
          console.error("Error getting calendar sources:", error);

          // Ensure calendar sources are initialized as fallback
          await this.initializeCalendarSources();

          // Final attempt
          try {
            return await this.safeDbOperation(() =>
              this.getDb().select().from(calendarSourcesTable).orderBy(calendarSourcesTable.displayName)
            );
          } catch (finalError) {
            console.error("Final attempt to get calendar sources failed:", finalError);
            throw finalError; // This will trigger fallback
          }
        }
      },
      FALLBACK_SOURCES,
      "getCalendarSources"
    );
  }

  // Update calendar source
  static async updateCalendarSource(id: string, updates: Partial<CalendarSourceRecord>): Promise<void> {
    return this.withDatabaseFallback(
      async () => {
        await this.safeDbOperation(() =>
          this.getDb().update(calendarSourcesTable)
            .set({ ...updates, updatedAt: new Date().toISOString() })
            .where(eq(calendarSourcesTable.id, id))
        );
      },
      undefined,
      "updateCalendarSource"
    );
  }

  // Multi-source import
  static async importFromMultipleSources(
    sources: CalendarSource[],
    progressCallback?: ProgressCallback,
    options?: { month?: string; year?: string; dateRange?: { startDate: Date; endDate: Date } }
  ): Promise<{ jobId: number; results: BulkScrapingResult }> {
    // Create import job
    const job: NewImportJob = {
      jobType: "multi-source",
      sources: JSON.stringify(sources),
      status: "running",
      startedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const jobId = await this.withDatabaseFallback(
      async () => {
        const [jobRecord] = await this.safeDbOperation(() =>
          this.getDb().insert(importJobs).values(job).returning()
        );
        return jobRecord.id;
      },
      Math.floor(Math.random() * 1000000), // Generate fake job ID for fallback
      "createImportJob"
    );

    try {
      progressCallback?.({
        processed: 0,
        total: sources.length,
        status: "Starting multi-source import...",
        errors: [],
        warnings: []
      });

      // Scrape all sources
      const results = await MultiSourceScraper.scrapeMultipleSources(sources, options);

      let totalImported = 0;
      const totalErrors: string[] = [...results.globalErrors];
      const totalWarnings: string[] = [];

      // Process each source result
      for (let i = 0; i < results.results.length; i++) {
        const sourceResult = results.results[i];

        progressCallback?.({
          currentSource: sourceResult.source,
          processed: i + 1,
          total: results.results.length,
          status: `Processing ${sourceResult.source}...`,
          errors: totalErrors,
          warnings: totalWarnings
        });

        // Import events from this source
        for (const scrapedEvent of sourceResult.events) {
          try {
            const newEvent = this.convertEnhancedScrapedEventToNewEvent(scrapedEvent);
            await this.createOrUpdateEvent(newEvent);
            totalImported++;
          } catch (error) {
            const errorMsg = `Failed to import event "${scrapedEvent.title}" from ${sourceResult.source}: ${error}`;
            totalErrors.push(errorMsg);
          }
        }

        totalWarnings.push(...sourceResult.warnings);
        totalErrors.push(...sourceResult.errors);

        // Update source statistics
        await this.updateCalendarSource(sourceResult.source, {
          lastScraped: new Date().toISOString(),
          totalEvents: sourceResult.events.length,
          successfulImports: sourceResult.events.length
        });
      }

      // Update job completion
      await this.withDatabaseFallback(
        async () => {
          await this.safeDbOperation(() =>
            this.getDb().update(importJobs)
              .set({
                status: "completed",
                completedAt: new Date().toISOString(),
                totalEvents: results.totalEvents,
                successfulImports: totalImported,
                errors: JSON.stringify(totalErrors),
                warnings: JSON.stringify(totalWarnings),
                results: JSON.stringify(results)
              })
              .where(eq(importJobs.id, jobId))
          );
        },
        undefined,
        "updateImportJob"
      );

      progressCallback?.({
        processed: sources.length,
        total: sources.length,
        status: `Completed! Imported ${totalImported} events from ${results.successfulSources} sources.`,
        errors: totalErrors,
        warnings: totalWarnings
      });

      return { jobId, results };

    } catch (error) {
      // Update job with error status
      await this.withDatabaseFallback(
        async () => {
          await this.safeDbOperation(() =>
            this.getDb().update(importJobs)
              .set({
                status: "failed",
                completedAt: new Date().toISOString(),
                errors: JSON.stringify([`Import failed: ${error}`])
              })
              .where(eq(importJobs.id, jobId))
          );
        },
        undefined,
        "updateImportJobError"
      );

      throw error;
    }
  }

  // Convert enhanced scraped event to database event
  static convertEnhancedScrapedEventToNewEvent(scraped: EnhancedScrapedEvent): NewEvent {
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
      sourceId: scraped.originalId || null,
      calendarSource: scraped.calendarSource,
      originalId: scraped.originalId || null,
      imageUrl: scraped.imageUrl || null,
      price: scraped.price || null,
      registrationUrl: scraped.registrationUrl || null,
      contactInfo: scraped.contactInfo || null,
      tags: scraped.tags ? JSON.stringify(scraped.tags) : null,
      venue: scraped.venue || null,
      organizerName: scraped.organizerName || null,
      organizerEmail: scraped.organizerEmail || null,
      organizerPhone: scraped.organizerPhone || null,
      importedAt: now,
      updatedAt: now,
      verificationStatus: "pending"
    };
  }

  // Create or update event (avoiding duplicates)
  static async createOrUpdateEvent(eventData: NewEvent): Promise<Event> {
    return this.withDatabaseFallback(
      async () => {
        // Check for existing event (by title, date, and source)
        const existing = await this.safeDbOperation(() =>
          this.getDb().select()
            .from(events)
            .where(
              and(
                eq(events.title, eventData.title),
                eq(events.startDate, eventData.startDate),
                eq(events.calendarSource, eventData.calendarSource || "wayland-town")
              )
            )
            .limit(1)
        );

        if (existing.length > 0) {
          // Update existing event
          const [updatedEvent] = await this.safeDbOperation(() =>
            this.getDb().update(events)
              .set({ ...eventData, updatedAt: new Date().toISOString() })
              .where(eq(events.id, existing[0].id))
              .returning()
          );
          return updatedEvent;
        } else {
          // Create new event
          const [newEvent] = await this.safeDbOperation(() =>
            this.getDb().insert(events).values(eventData).returning()
          );
          return newEvent;
        }
      },
      FALLBACK_EVENTS[0], // Return first fallback event as placeholder
      "createOrUpdateEvent"
    );
  }

  // Get all events with fallback support
  static async getAllEvents(
    page = 1,
    limit = 50,
    filters?: {
      search?: string;
      category?: string;
      department?: string;
      calendarSource?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<{ events: Event[]; total: number }> {
    return this.withDatabaseFallback(
      async () => {
        ensureInitialized();
        // Ensure calendar sources are initialized
        await this.initializeCalendarSources();

        const offset = (page - 1) * limit;

        const whereConditions = [];

        if (filters?.search) {
          whereConditions.push(
            like(events.title, `%${filters.search}%`)
          );
        }

        if (filters?.category) {
          whereConditions.push(eq(events.category, filters.category));
        }

        if (filters?.department) {
          whereConditions.push(eq(events.department, filters.department));
        }

        if (filters?.calendarSource) {
          whereConditions.push(eq(events.calendarSource, filters.calendarSource));
        }

        // Date filtering
        if (filters?.startDate) {
          whereConditions.push(sql`${events.startDate} >= ${filters.startDate}T00:00:00.000Z`);
        }

        if (filters?.endDate) {
          whereConditions.push(sql`${events.startDate} <= ${filters.endDate}T23:59:59.999Z`);
        }

        const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

        const [eventsResult, countResult] = await Promise.all([
          this.safeDbOperation(() =>
            this.getDb().select()
              .from(events)
              .where(whereClause)
              .orderBy(events.startDate)
              .limit(limit)
              .offset(offset)
          ),
          this.safeDbOperation(() =>
            this.getDb().select({ count: sql<number>`count(*)` })
              .from(events)
              .where(whereClause)
          )
        ]);

        return {
          events: eventsResult,
          total: countResult[0].count
        };
      },
      {
        events: FALLBACK_EVENTS.slice((page - 1) * limit, page * limit),
        total: FALLBACK_EVENTS.length
      },
      "getAllEvents"
    );
  }

  static async createEvent(eventData: NewEvent): Promise<Event> {
    return this.withDatabaseFallback(
      async () => {
        const [newEvent] = await this.safeDbOperation(() =>
          this.getDb().insert(events).values(eventData).returning()
        );
        return newEvent;
      },
      FALLBACK_EVENTS[0],
      "createEvent"
    );
  }

  static async updateEvent(id: number, eventData: Partial<NewEvent>): Promise<Event> {
    return this.withDatabaseFallback(
      async () => {
        const [updatedEvent] = await this.safeDbOperation(() =>
          this.getDb()
            .update(events)
            .set({ ...eventData, updatedAt: new Date().toISOString() })
            .where(eq(events.id, id))
            .returning()
        );

        return updatedEvent;
      },
      FALLBACK_EVENTS[0],
      "updateEvent"
    );
  }

  static async deleteEvent(id: number): Promise<void> {
    return this.withDatabaseFallback(
      async () => {
        await this.safeDbOperation(() =>
          this.getDb().delete(events).where(eq(events.id, id))
        );
      },
      undefined,
      "deleteEvent"
    );
  }

  static async getEventStats(): Promise<{
    totalEvents: number;
    categories: { name: string; count: number }[];
    departments: { name: string; count: number }[];
    sources: { name: string; count: number }[];
    lastImport: string | null;
  }> {
    return this.withDatabaseFallback(
      async () => {
        ensureInitialized();
        // Ensure calendar sources are initialized first
        await this.initializeCalendarSources();

        const [
          totalResult,
          categoriesResult,
          departmentsResult,
          sourcesResult,
          lastImportResult
        ] = await Promise.all([
          this.safeDbOperation(() =>
            this.getDb().select({ count: sql<number>`count(*)` }).from(events)
          ),
          this.safeDbOperation(() =>
            this.getDb().select({
              name: events.category,
              count: sql<number>`count(*)`
            }).from(events).where(sql`${events.category} IS NOT NULL`).groupBy(events.category)
          ),
          this.safeDbOperation(() =>
            this.getDb().select({
              name: events.department,
              count: sql<number>`count(*)`
            }).from(events).where(sql`${events.department} IS NOT NULL`).groupBy(events.department)
          ),
          this.safeDbOperation(() =>
            this.getDb().select({
              name: events.calendarSource,
              count: sql<number>`count(*)`
            }).from(events).groupBy(events.calendarSource)
          ),
          this.safeDbOperation(() =>
            this.getDb().select({ lastImport: events.importedAt })
              .from(events)
              .orderBy(desc(events.importedAt))
              .limit(1)
          )
        ]);

        return {
          totalEvents: totalResult[0].count,
          categories: categoriesResult.map(r => ({ name: r.name || "Unknown", count: r.count })),
          departments: departmentsResult.map(r => ({ name: r.name || "Unknown", count: r.count })),
          sources: sourcesResult.map(r => ({ name: r.name || "Unknown", count: r.count })),
          lastImport: lastImportResult[0]?.lastImport || null
        };
      },
      {
        totalEvents: FALLBACK_EVENTS.length,
        categories: [
          { name: "meeting", count: 1 },
          { name: "performance", count: 1 },
          { name: "children", count: 1 },
          { name: "soccer", count: 1 },
          { name: "arts", count: 1 },
          { name: "family", count: 1 },
          { name: "literature", count: 1 },
          { name: "market", count: 1 }
        ],
        departments: [
          { name: "town-clerk", count: 1 },
          { name: "arts", count: 2 },
          { name: "library", count: 2 },
          { name: "athletics", count: 1 },
          { name: "planning", count: 1 },
          { name: "recreation", count: 1 },
          { name: "community", count: 1 }
        ],
        sources: FALLBACK_SOURCES.map(s => ({ name: s.displayName, count: s.totalEvents || 0 })),
        lastImport: "2025-08-01T12:00:00.000Z"
      },
      "getEventStats"
    );
  }

  // Get import jobs
  static async getImportJobs(limit = 10): Promise<ImportJob[]> {
    return this.withDatabaseFallback(
      async () => {
        return await this.safeDbOperation(() =>
          this.getDb().select()
            .from(importJobs)
            .orderBy(desc(importJobs.createdAt))
            .limit(limit)
        );
      },
      [], // Empty array as fallback
      "getImportJobs"
    );
  }

  // Get import job by ID
  static async getImportJob(id: number): Promise<ImportJob | null> {
    return this.withDatabaseFallback(
      async () => {
        const result = await this.safeDbOperation(() =>
          this.getDb().select()
            .from(importJobs)
            .where(eq(importJobs.id, id))
            .limit(1)
        );

        return result[0] || null;
      },
      null,
      "getImportJob"
    );
  }

  // Legacy methods for backward compatibility
  static async getEventsByDateRange(startDate: string, endDate: string): Promise<Event[]> {
    const result = await this.getAllEvents(1, 1000);
    return result.events.filter(event =>
      event.startDate >= startDate && event.startDate <= endDate
    );
  }

  static async importCalendarMonth(month?: string, year?: string): Promise<Record<string, unknown>> {
    // Legacy method - redirect to multi-source import
    console.warn("importCalendarMonth is deprecated, use importFromMultipleSources instead");
    const result = await this.importFromMultipleSources(["wayland-town"], undefined, { month, year });
    return {
      imported: result.results.totalEvents,
      updated: 0,
      errors: result.results.globalErrors,
      warnings: [],
      metadata: {}
    };
  }
}
