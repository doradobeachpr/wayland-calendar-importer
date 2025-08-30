// Simplified scheduler service - placeholder for future cron implementation
import { EventService } from "./eventService";
import { format } from "date-fns";

interface ScheduledJob {
  id: string;
  description: string;
  schedule: string;
  active: boolean;
  lastRun?: string;
  nextRun?: string;
}

export class SchedulerService {
  private static jobs: Map<string, ScheduledJob> = new Map();
  private static isInitialized = false;

  static initialize() {
    if (this.isInitialized || typeof window !== "undefined") {
      return;
    }

    // Set up default scheduled jobs (placeholder)
    this.setupDefaultJobs();

    this.isInitialized = true;
    console.log("Scheduler service initialized (placeholder mode)");
  }

  static setupDefaultJobs() {
    this.jobs.set("monthly-import", {
      id: "monthly-import",
      description: "Monthly calendar import for current and next month",
      schedule: "0 2 1 * *", // Run at 2 AM on the 1st of every month
      active: false,
    });

    this.jobs.set("weekly-import", {
      id: "weekly-import",
      description: "Weekly calendar import for current month",
      schedule: "0 6 * * 1", // Run at 6 AM every Monday
      active: false,
    });
  }

  static getJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values());
  }

  static startJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    job.active = true;
    console.log(`Started scheduled job: ${jobId} (placeholder mode)`);
    return true;
  }

  static stopJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    job.active = false;
    console.log(`Stopped scheduled job: ${jobId}`);
    return true;
  }

  static deleteJob(jobId: string): boolean {
    const deleted = this.jobs.delete(jobId);
    if (deleted) {
      console.log(`Deleted scheduled job: ${jobId}`);
    }
    return deleted;
  }

  static async runJobNow(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    try {
      console.log(`Running job ${jobId} manually...`);

      // Execute the job's logic manually
      const currentDate = new Date();
      const currentMonth = format(currentDate, "MM");
      const currentYear = format(currentDate, "yyyy");

      await EventService.importCalendarMonth(currentMonth, currentYear);

      // Update last run time
      job.lastRun = new Date().toISOString();

      console.log(`Job ${jobId} completed successfully`);
      return true;
    } catch (error) {
      console.error(`Failed to run job ${jobId}:`, error);
      return false;
    }
  }

  static scheduleCustomJob(
    id: string,
    description: string,
    schedule: string,
    month?: string,
    year?: string
  ) {
    this.jobs.set(id, {
      id,
      description,
      schedule,
      active: false,
    });

    console.log(`Custom job ${id} scheduled (placeholder mode)`);
  }

  static getJobStatus(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      description: job.description,
      schedule: job.schedule,
      active: job.active,
      lastRun: job.lastRun,
      nextRun: job.nextRun,
    };
  }
}

// Initialize scheduler when module loads (only on server)
if (typeof window === "undefined") {
  SchedulerService.initialize();
}
