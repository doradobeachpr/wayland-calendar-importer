import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

// Database configuration for different environments
const getDatabaseConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isNetlify = process.env.NETLIFY === 'true';
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;

  if (isProduction && isNetlify) {
    // For Netlify, use a more persistent approach
    const netlifyDir = '/tmp/.netlify';
    if (!fs.existsSync(netlifyDir)) {
      fs.mkdirSync(netlifyDir, { recursive: true });
    }
    return {
      path: path.join(netlifyDir, 'calendar.db'),
      options: {
        // Optimize for serverless
        timeout: 10000
        // verbose is omitted to disable logging in production
      }
    };
  } else if (isProduction && isVercel) {
    // For Vercel, use /tmp directory
    const tmpDir = '/tmp';
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    return {
      path: path.join(tmpDir, 'calendar.db'),
      options: {
        // Optimize for Vercel serverless
        timeout: 15000,
        // Disable WAL mode for better Vercel compatibility
        readonly: false
      }
    };
  } else if (isProduction) {
    // Generic production environment
    return {
      path: process.env.DATABASE_URL || '/tmp/calendar.db',
      options: {
        timeout: 10000
        // verbose is omitted to disable logging in production
      }
    };
  } else {
    // Development environment
    return {
      path: process.env.DATABASE_PATH || path.join(process.cwd(), "calendar.db"),
      options: {
        timeout: 5000,
        ...(process.env.DEBUG_SQL && { verbose: console.log })
      }
    };
  }
};

let sqlite: Database.Database | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;
let isInitialized = false;

// Connection management with retry logic
function createConnection(): Database.Database {
  const config = getDatabaseConfig();
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;

  try {
    const db = new Database(config.path, config.options);

    // Configure SQLite for better performance in serverless
    if (!isVercel) {
      // Standard optimizations for non-Vercel environments
      db.pragma('journal_mode = WAL');
      db.pragma('synchronous = NORMAL');
      db.pragma('cache_size = 1000');
      db.pragma('temp_store = memory');
      db.pragma('mmap_size = 268435456'); // 256MB
    } else {
      // Vercel-optimized settings
      db.pragma('journal_mode = DELETE'); // More compatible with Vercel
      db.pragma('synchronous = FULL');
      db.pragma('cache_size = 500');
      db.pragma('temp_store = memory');
    }

    // Test the connection
    db.prepare('SELECT 1').get();
    console.log(`✅ Database connected: ${config.path}`);
    return db;
  } catch (error) {
    console.error(`❌ Database connection failed: ${error}`);
    throw new Error(`Failed to connect to database: ${error}`);
  }
}

function getDatabase() {
  if (!sqlite || !dbInstance) {
    try {
      sqlite = createConnection();
      dbInstance = drizzle(sqlite, { schema });

      // Initialize schema if needed
      if (!isInitialized) {
        initializeSchema();
        isInitialized = true;
      }
    } catch (error) {
      console.error('Failed to get database connection:', error);
      // In production, try to use a fallback or return null to trigger fallback mode
      if (process.env.NODE_ENV === 'production') {
        sqlite = null;
        dbInstance = null;
        return null;
      }
      throw error;
    }
  }
  return dbInstance;
}

export { getDatabase as db };

// Health check function
export function isDatabaseHealthy(): boolean {
  try {
    if (!sqlite) return false;
    sqlite.prepare('SELECT 1').get();
    return true;
  } catch (error) {
    console.warn('Database health check failed:', error);
    return false;
  }
}

// Force reconnection (useful for serverless cold starts)
export function reconnectDatabase(): void {
  try {
    if (sqlite) {
      sqlite.close();
    }
  } catch (error) {
    console.warn('Error closing existing connection:', error);
  }
  sqlite = null;
  dbInstance = null;
  isInitialized = false;
  // Trigger new connection
  getDatabase();
}

// Initialize database schema with improved error handling
function initializeSchema(): void {
  if (!sqlite) {
    console.warn('Cannot initialize schema: no database connection');
    return;
  }

  try {
    console.log('🔧 Initializing database schema...');

    // Check existing tables
    const tables = sqlite.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all();

    const tableNames = tables.map((table: unknown) => (table as { name: string }).name);
    console.log('📊 Existing tables:', tableNames);

    // Create calendar_sources table
    if (!tableNames.includes('calendar_sources')) {
      sqlite.exec(`
        CREATE TABLE calendar_sources (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          display_name TEXT NOT NULL,
          url TEXT NOT NULL,
          description TEXT,
          is_active INTEGER DEFAULT 1,
          last_scraped TEXT,
          total_events INTEGER DEFAULT 0,
          successful_imports INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);
      console.log('✅ Created calendar_sources table');
    }

    // Create import_jobs table
    if (!tableNames.includes('import_jobs')) {
      sqlite.exec(`
        CREATE TABLE import_jobs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          job_type TEXT NOT NULL,
          sources TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          started_at TEXT,
          completed_at TEXT,
          total_events INTEGER DEFAULT 0,
          successful_imports INTEGER DEFAULT 0,
          errors TEXT,
          warnings TEXT,
          results TEXT,
          created_at TEXT NOT NULL
        )
      `);
      console.log('✅ Created import_jobs table');
    }

    // Create or update events table
    if (!tableNames.includes('events')) {
      sqlite.exec(`
        CREATE TABLE events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          start_date TEXT NOT NULL,
          end_date TEXT,
          start_time TEXT,
          end_time TEXT,
          is_all_day INTEGER DEFAULT 0,
          location TEXT,
          category TEXT,
          department TEXT,
          url TEXT,
          source_id TEXT,
          calendar_source TEXT DEFAULT 'wayland-town',
          original_id TEXT,
          image_url TEXT,
          price TEXT,
          registration_url TEXT,
          contact_info TEXT,
          tags TEXT,
          venue TEXT,
          organizer_name TEXT,
          organizer_email TEXT,
          organizer_phone TEXT,
          imported_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          last_verified TEXT,
          verification_status TEXT DEFAULT 'pending'
        )
      `);
      console.log('✅ Created events table');
    } else {
      // Add missing columns to events table
      const eventColumns = sqlite.prepare("PRAGMA table_info(events)").all();
      const columnNames = eventColumns.map((col: unknown) => (col as { name: string }).name);

      const newColumns = [
        { name: 'calendar_source', sql: 'ALTER TABLE events ADD COLUMN calendar_source TEXT DEFAULT "wayland-town"' },
        { name: 'original_id', sql: 'ALTER TABLE events ADD COLUMN original_id TEXT' },
        { name: 'image_url', sql: 'ALTER TABLE events ADD COLUMN image_url TEXT' },
        { name: 'price', sql: 'ALTER TABLE events ADD COLUMN price TEXT' },
        { name: 'registration_url', sql: 'ALTER TABLE events ADD COLUMN registration_url TEXT' },
        { name: 'contact_info', sql: 'ALTER TABLE events ADD COLUMN contact_info TEXT' },
        { name: 'tags', sql: 'ALTER TABLE events ADD COLUMN tags TEXT' },
        { name: 'venue', sql: 'ALTER TABLE events ADD COLUMN venue TEXT' },
        { name: 'organizer_name', sql: 'ALTER TABLE events ADD COLUMN organizer_name TEXT' },
        { name: 'organizer_email', sql: 'ALTER TABLE events ADD COLUMN organizer_email TEXT' },
        { name: 'organizer_phone', sql: 'ALTER TABLE events ADD COLUMN organizer_phone TEXT' },
        { name: 'last_verified', sql: 'ALTER TABLE events ADD COLUMN last_verified TEXT' },
        { name: 'verification_status', sql: 'ALTER TABLE events ADD COLUMN verification_status TEXT DEFAULT "pending"' }
      ];

      for (const column of newColumns) {
        if (!columnNames.includes(column.name)) {
          sqlite.exec(column.sql);
          console.log(`✅ Added column ${column.name} to events table`);
        }
      }
    }

    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date)',
      'CREATE INDEX IF NOT EXISTS idx_events_calendar_source ON events(calendar_source)',
      'CREATE INDEX IF NOT EXISTS idx_events_category ON events(category)',
      'CREATE INDEX IF NOT EXISTS idx_calendar_sources_active ON calendar_sources(is_active)',
    ];

    for (const indexSQL of indexes) {
      sqlite.exec(indexSQL);
    }

    console.log('✅ Database schema initialization completed');
  } catch (error) {
    console.error('❌ Failed to initialize database schema:', error);
    throw error;
  }
}

// Ensure database is initialized - safe to call multiple times
export function ensureInitialized(): boolean {
  try {
    const db = getDatabase();
    return db !== null;
  } catch (error) {
    console.error('Failed to ensure database initialization:', error);
    return false;
  }
}

// Graceful shutdown
export function closeDatabase(): void {
  try {
    if (sqlite) {
      sqlite.close();
      console.log('✅ Database connection closed');
    }
  } catch (error) {
    console.warn('Error closing database:', error);
  } finally {
    sqlite = null;
    dbInstance = null;
    isInitialized = false;
  }
}
