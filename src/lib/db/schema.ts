import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Calendar Sources enum
export const calendarSources = [
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
] as const;

export type CalendarSource = typeof calendarSources[number];

// Calendar Sources table for managing multiple sources
export const calendarSourcesTable = sqliteTable("calendar_sources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  displayName: text("display_name").notNull(),
  url: text("url").notNull(),
  description: text("description"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastScraped: text("last_scraped"),
  totalEvents: integer("total_events").notNull().default(0),
  successfulImports: integer("successful_imports").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const events = sqliteTable("events", {
  id: integer("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  startDate: text("start_date").notNull(), // ISO string
  endDate: text("end_date"), // ISO string
  startTime: text("start_time"), // HH:MM format
  endTime: text("end_time"), // HH:MM format
  isAllDay: integer("is_all_day", { mode: "boolean" }).notNull().default(false),
  location: text("location"),
  category: text("category"),
  department: text("department"),
  url: text("url"),
  sourceId: text("source_id"),

  // Multi-source fields
  calendarSource: text("calendar_source").notNull().default("wayland-town"),
  originalId: text("original_id"), // ID from source system
  imageUrl: text("image_url"),
  price: text("price"), // For paid events
  registrationUrl: text("registration_url"),
  contactInfo: text("contact_info"),
  tags: text("tags"), // JSON array of tags
  venue: text("venue"), // Separate from location for better categorization
  organizerName: text("organizer_name"),
  organizerEmail: text("organizer_email"),
  organizerPhone: text("organizer_phone"),

  // Tracking fields
  importedAt: text("imported_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  lastVerified: text("last_verified"), // When we last confirmed event still exists
  verificationStatus: text("verification_status").default("pending"), // pending, verified, stale, removed
});

// Import Jobs table for tracking multi-source imports
export const importJobs = sqliteTable("import_jobs", {
  id: integer("id").primaryKey(),
  jobType: text("job_type").notNull(), // "single-source", "multi-source", "scheduled"
  sources: text("sources").notNull(), // JSON array of source IDs
  status: text("status").notNull().default("pending"), // pending, running, completed, failed
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  totalEvents: integer("total_events").notNull().default(0),
  successfulImports: integer("successful_imports").notNull().default(0),
  errors: text("errors"), // JSON array of error messages
  warnings: text("warnings"), // JSON array of warnings
  results: text("results"), // JSON object with detailed results
  createdAt: text("created_at").notNull(),
});

// Zod schemas for validation
export const insertEventSchema = createInsertSchema(events);
export const selectEventSchema = createSelectSchema(events);
export const insertCalendarSourceSchema = createInsertSchema(calendarSourcesTable);
export const selectCalendarSourceSchema = createSelectSchema(calendarSourcesTable);
export const insertImportJobSchema = createInsertSchema(importJobs);
export const selectImportJobSchema = createSelectSchema(importJobs);

export type Event = z.infer<typeof selectEventSchema>;
export type NewEvent = z.infer<typeof insertEventSchema>;
export type CalendarSourceRecord = z.infer<typeof selectCalendarSourceSchema>;
export type NewCalendarSource = z.infer<typeof insertCalendarSourceSchema>;
export type ImportJob = z.infer<typeof selectImportJobSchema>;
export type NewImportJob = z.infer<typeof insertImportJobSchema>;

// Enhanced scraped event interface
export interface EnhancedScrapedEvent {
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
  originalId?: string;

  // Enhanced fields
  calendarSource: CalendarSource;
  imageUrl?: string;
  price?: string;
  registrationUrl?: string;
  contactInfo?: string;
  tags?: string[];
  venue?: string;
  organizerName?: string;
  organizerEmail?: string;
  organizerPhone?: string;
}
