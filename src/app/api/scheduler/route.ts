import { NextRequest, NextResponse } from "next/server";
import { SchedulerService } from "@/lib/services/schedulerService";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/scheduler - Get all scheduled jobs
export async function GET() {
  try {
    const jobs = SchedulerService.getJobs();
    return NextResponse.json({
      success: true,
      data: jobs.map(job => ({
        id: job.id,
        description: job.description,
        schedule: job.schedule,
        active: job.active,
        lastRun: job.lastRun,
        nextRun: job.nextRun,
      })),
    });
  } catch (error) {
    console.error("Error fetching scheduled jobs:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch scheduled jobs" },
      { status: 500 }
    );
  }
}

// POST /api/scheduler - Create, start, stop, or run jobs
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, jobId, description, schedule, month, year } = body;

    switch (action) {
      case "create":
        if (!jobId || !description || !schedule) {
          return NextResponse.json(
            { success: false, error: "Missing required fields for job creation" },
            { status: 400 }
          );
        }

        try {
          SchedulerService.scheduleCustomJob(jobId, description, schedule, month, year);
          return NextResponse.json({
            success: true,
            message: `Job ${jobId} created successfully`,
          });
        } catch (error) {
          return NextResponse.json(
            { success: false, error: `Failed to create job: ${error}` },
            { status: 400 }
          );
        }

      case "start":
        if (!jobId) {
          return NextResponse.json(
            { success: false, error: "Job ID is required" },
            { status: 400 }
          );
        }

        const started = SchedulerService.startJob(jobId);
        if (started) {
          return NextResponse.json({
            success: true,
            message: `Job ${jobId} started successfully`,
          });
        } else {
          return NextResponse.json(
            { success: false, error: `Job ${jobId} not found` },
            { status: 404 }
          );
        }

      case "stop":
        if (!jobId) {
          return NextResponse.json(
            { success: false, error: "Job ID is required" },
            { status: 400 }
          );
        }

        const stopped = SchedulerService.stopJob(jobId);
        if (stopped) {
          return NextResponse.json({
            success: true,
            message: `Job ${jobId} stopped successfully`,
          });
        } else {
          return NextResponse.json(
            { success: false, error: `Job ${jobId} not found` },
            { status: 404 }
          );
        }

      case "run":
        if (!jobId) {
          return NextResponse.json(
            { success: false, error: "Job ID is required" },
            { status: 400 }
          );
        }

        const executed = await SchedulerService.runJobNow(jobId);
        if (executed) {
          return NextResponse.json({
            success: true,
            message: `Job ${jobId} executed successfully`,
          });
        } else {
          return NextResponse.json(
            { success: false, error: `Failed to execute job ${jobId}` },
            { status: 500 }
          );
        }

      case "delete":
        if (!jobId) {
          return NextResponse.json(
            { success: false, error: "Job ID is required" },
            { status: 400 }
          );
        }

        const deleted = SchedulerService.deleteJob(jobId);
        if (deleted) {
          return NextResponse.json({
            success: true,
            message: `Job ${jobId} deleted successfully`,
          });
        } else {
          return NextResponse.json(
            { success: false, error: `Job ${jobId} not found` },
            { status: 404 }
          );
        }

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action. Use 'create', 'start', 'stop', 'run', or 'delete'" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error managing scheduled jobs:", error);
    return NextResponse.json(
      { success: false, error: "Failed to manage scheduled jobs" },
      { status: 500 }
    );
  }
}
