import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run daily at 2 AM UTC to check for expired tenancies
crons.cron(
    "check-expired-tenancies",
    "0 2 * * *", // Daily at 2 AM UTC
    internal.tenancy.endExpiredTenancies,
    {}
);

export default crons;

