import { NextResponse } from "next/server";
import { isDatabaseHealthy, ensureInitialized } from "@/lib/db";
import { EventService } from "@/lib/services/eventService";

export const dynamic = 'force-dynamic';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  environment: string;
  version: string;
  checks: {
    database: HealthCheckItem;
    api: HealthCheckItem;
    events: HealthCheckItem;
    sources: HealthCheckItem;
  };
  uptime: number;
  memory?: {
    used: number;
    total: number;
    percentage: number;
  };
}

interface HealthCheckItem {
  status: 'pass' | 'fail' | 'warn';
  message: string;
  duration: number;
  details?: Record<string, unknown>;
}

const startTime = Date.now();

// GET /api/health - Comprehensive health check
export async function GET() {
  const checkStartTime = Date.now();
  const health: HealthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    version: '33',
    checks: {
      database: await checkDatabase(),
      api: await checkAPI(),
      events: await checkEvents(),
      sources: await checkSources()
    },
    uptime: Date.now() - startTime
  };

  // Add memory usage if available
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const memUsage = process.memoryUsage();
    health.memory = {
      used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
    };
  }

  // Determine overall status
  const checkStatuses = Object.values(health.checks).map(check => check.status);

  if (checkStatuses.some(status => status === 'fail')) {
    health.status = 'unhealthy';
  } else if (checkStatuses.some(status => status === 'warn')) {
    health.status = 'degraded';
  } else {
    health.status = 'healthy';
  }

  const totalDuration = Date.now() - checkStartTime;

  // Return appropriate HTTP status
  const httpStatus = health.status === 'healthy' ? 200 :
                    health.status === 'degraded' ? 200 : 503;

  return NextResponse.json({
    ...health,
    duration: totalDuration
  }, { status: httpStatus });
}

async function checkDatabase(): Promise<HealthCheckItem> {
  const start = Date.now();

  try {
    // Test database initialization
    const initialized = ensureInitialized();
    if (!initialized) {
      return {
        status: 'fail',
        message: 'Database initialization failed',
        duration: Date.now() - start
      };
    }

    // Test database health
    const isHealthy = isDatabaseHealthy();
    if (!isHealthy) {
      return {
        status: 'fail',
        message: 'Database health check failed',
        duration: Date.now() - start
      };
    }

    return {
      status: 'pass',
      message: 'Database is healthy and responsive',
      duration: Date.now() - start,
      details: {
        type: 'SQLite',
        path: process.env.NODE_ENV === 'production' ? '/tmp/.netlify/calendar.db' : 'local'
      }
    };
  } catch (error) {
    return {
      status: 'fail',
      message: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: Date.now() - start
    };
  }
}

async function checkAPI(): Promise<HealthCheckItem> {
  const start = Date.now();

  try {
    // Test basic API functionality
    const testResponse = await fetch('/api/test').catch(() => null);

    if (!testResponse) {
      return {
        status: 'warn',
        message: 'API routes may not be properly configured (running in fallback mode)',
        duration: Date.now() - start,
        details: {
          fallbackMode: true,
          reason: 'API routes unreachable'
        }
      };
    }

    if (testResponse.status === 200) {
      return {
        status: 'pass',
        message: 'API routes are functional',
        duration: Date.now() - start
      };
    } else {
      return {
        status: 'warn',
        message: `API routes responding with status ${testResponse.status}`,
        duration: Date.now() - start
      };
    }
  } catch (error) {
    return {
      status: 'warn',
      message: 'API health check failed - using fallback mode',
      duration: Date.now() - start,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

async function checkEvents(): Promise<HealthCheckItem> {
  const start = Date.now();

  try {
    const stats = await EventService.getEventStats();

    return {
      status: 'pass',
      message: `Events service operational with ${stats.totalEvents} events`,
      duration: Date.now() - start,
      details: {
        totalEvents: stats.totalEvents,
        categories: stats.categories.length,
        sources: stats.sources.length,
        lastImport: stats.lastImport
      }
    };
  } catch (error) {
    return {
      status: 'warn',
      message: 'Events service using fallback data',
      duration: Date.now() - start,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        fallbackMode: true
      }
    };
  }
}

async function checkSources(): Promise<HealthCheckItem> {
  const start = Date.now();

  try {
    const sources = await EventService.getCalendarSources();
    const activeSources = sources.filter(s => s.isActive);

    return {
      status: 'pass',
      message: `Calendar sources configured: ${activeSources.length}/${sources.length} active`,
      duration: Date.now() - start,
      details: {
        totalSources: sources.length,
        activeSources: activeSources.length,
        sources: sources.map(s => ({
          id: s.id,
          name: s.displayName,
          active: s.isActive,
          events: s.totalEvents || 0
        }))
      }
    };
  } catch (error) {
    return {
      status: 'warn',
      message: 'Sources service using fallback configuration',
      duration: Date.now() - start,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        fallbackMode: true
      }
    };
  }
}

// POST /api/health - Force system check and refresh
export async function POST() {
  try {
    console.log('🔄 Forcing system health check and refresh...');

    // Force database reconnection
    const { reconnectDatabase } = await import('@/lib/db');
    reconnectDatabase();

    // Reinitialize calendar sources
    await EventService.initializeCalendarSources();

    // Return updated health status
    return GET();
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Health check refresh failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
