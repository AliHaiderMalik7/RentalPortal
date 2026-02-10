import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const logDisclaimerAcceptance = mutation({
  args: {
    userId: v.id("users"),
    country: v.string(),
    disclaimerVersion: v.string(),
    ip: v.string(),
    device: v.string(),
    userAgent: v.string(),
    acceptanceContext: v.union(
      v.literal("tenant_signup"),
      v.literal("landlord_signup"),
      v.literal("tenant_invite_acceptance"),
      v.literal("landlord_invite_acceptance"),
      v.literal("review_submission"),
      v.literal("tenant_initiated_request"),
      v.literal("landlord_verification"),
    ),
    relatedTenancyId: v.optional(v.id("tenancies")),
  },
  returns: v.object({
    success: v.boolean(),
    logId: v.optional(v.id("complianceLogs")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId || currentUserId !== args.userId) {
      return { success: false, error: "Unauthorized" };
    }

    try {
      const logId = await ctx.db.insert("complianceLogs", {
        userId: args.userId,
        disclaimerVersionId: undefined, // Will be handled by schema as optional
        country: args.country,
        disclaimerVersion: args.disclaimerVersion,
        ip: args.ip,
        device: args.device,
        userAgent: args.userAgent,
        acceptanceContext: args.acceptanceContext,
        relatedTenancyId: args.relatedTenancyId,
        timestamp: Date.now(),
        retentionExpiryDate: Date.now() + 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
        isArchived: false,
      });

      return { success: true, logId };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
});

export const getUserComplianceLogs = query({
  args: {
    userId: v.id("users"),
    includeArchived: v.optional(v.boolean()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("User must be authenticated");
    }

    // Only allow users to see their own logs, or admins to see any logs
    const currentUser = await ctx.db.get(currentUserId);
    const isAdmin = currentUser?.roles === "admin";

    if (!isAdmin && currentUserId !== args.userId) {
      throw new Error("Unauthorized to view these compliance logs");
    }

    const logs = await ctx.db
      .query("complianceLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter(
        (q) =>
          args.includeArchived
            ? q.neq(q.field("isArchived"), null) // Show all if includeArchived is true
            : q.eq(q.field("isArchived"), false), // Only show non-archived
      )
      .order("desc")
      .collect();

    return logs;
  },
});

export const getComplianceLogsForTenancy = query({
  args: { tenancyId: v.id("tenancies") },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User must be authenticated");
    }

    // Verify user has access to this tenancy
    const tenancy = await ctx.db.get(args.tenancyId);
    if (!tenancy) {
      throw new Error("Tenancy not found");
    }

    if (tenancy.landlordId !== userId && tenancy.tenantId !== userId) {
      throw new Error("Unauthorized to view compliance logs for this tenancy");
    }

    const logs = await ctx.db
      .query("complianceLogs")
      .withIndex("by_tenancy", (q) => q.eq("relatedTenancyId", args.tenancyId))
      .order("desc")
      .collect();

    return logs;
  },
});

export const archiveExpiredComplianceLogs = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    archivedCount: v.number(),
  }),
  handler: async (ctx) => {
    // This would typically be called by a cron job
    // Archive logs that have passed their retention period

    const expiredLogs = await ctx.db
      .query("complianceLogs")
      .filter((q) =>
        q.and(
          q.eq(q.field("isArchived"), false),
          q.lt(q.field("retentionExpiryDate"), Date.now()),
        ),
      )
      .collect();

    let archivedCount = 0;

    for (const log of expiredLogs) {
      await ctx.db.patch(log._id, {
        isArchived: true,
        archivedAt: Date.now(),
      });
      archivedCount++;
    }

    return { success: true, archivedCount };
  },
});

export const getComplianceReport = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  returns: v.object({
    totalLogs: v.number(),
    logsByCountry: v.any(),
    logsByContext: v.any(),
    retentionStatus: v.object({
      activeCount: v.number(),
      archivedCount: v.number(),
      nearExpiryCount: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User must be authenticated");
    }

    // Only admins can access compliance reports
    const user = await ctx.db.get(userId);
    if (user?.roles !== "admin") {
      throw new Error("Admin access required");
    }

    const startDate = args.startDate || 0;
    const endDate = args.endDate || Date.now();

    // Get logs within date range
    const logs = await ctx.db
      .query("complianceLogs")
      .filter((q) =>
        q.and(
          q.gte(q.field("timestamp"), startDate),
          q.lte(q.field("timestamp"), endDate),
        ),
      )
      .collect();

    // Aggregate data
    const logsByCountry: Record<string, number> = {};
    const logsByContext: Record<string, number> = {};

    for (const log of logs) {
      logsByCountry[log.country] = (logsByCountry[log.country] || 0) + 1;
      logsByContext[log.acceptanceContext] =
        (logsByContext[log.acceptanceContext] || 0) + 1;
    }

    // Get retention status
    const allLogs = await ctx.db.query("complianceLogs").collect();
    const now = Date.now();
    const oneYearFromNow = now + 365 * 24 * 60 * 60 * 1000;

    const retentionStatus = {
      activeCount: allLogs.filter((l) => !l.isArchived).length,
      archivedCount: allLogs.filter((l) => l.isArchived).length,
      nearExpiryCount: allLogs.filter(
        (l) => !l.isArchived && l.retentionExpiryDate <= oneYearFromNow,
      ).length,
    };

    return {
      totalLogs: logs.length,
      logsByCountry,
      logsByContext,
      retentionStatus,
    };
  },
});

export const updateDisclaimerVersion = mutation({
  args: {
    newVersion: v.string(),
    region: v.union(
      v.literal("US"),
      v.literal("UK"),
      v.literal("EU"),
      v.literal("INTERNATIONAL"),
    ),
    changelog: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    versionId: v.optional(v.id("disclaimerVersions")),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User must be authenticated");
    }

    // Only admins can update disclaimer versions
    const user = await ctx.db.get(userId);
    if (user?.roles !== "admin") {
      throw new Error("Admin access required");
    }

    const versionId = await ctx.db.insert("disclaimerVersions", {
      version: args.newVersion,
      region: args.region,
      changelog: args.changelog,
      content: "Default disclaimer content", // Add required field
      category: "tenant_signup", // Add required field with default
      createdBy: userId,
      createdAt: Date.now(),
      isActive: true,
    });

    // Deactivate previous versions for this region
    const previousVersions = await ctx.db
      .query("disclaimerVersions")
      .withIndex("by_region", (q) => q.eq("region", args.region))
      .filter((q) =>
        q.and(
          q.neq(q.field("_id"), versionId),
          q.eq(q.field("isActive"), true),
        ),
      )
      .collect();

    for (const version of previousVersions) {
      await ctx.db.patch(version._id, { isActive: false });
    }

    return { success: true, versionId };
  },
});

export const getCurrentDisclaimerVersion = query({
  args: {
    region: v.union(
      v.literal("US"),
      v.literal("UK"),
      v.literal("EU"),
      v.literal("INTERNATIONAL"),
    ),
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const currentVersion = await ctx.db
      .query("disclaimerVersions")
      .withIndex("by_region", (q) => q.eq("region", args.region))
      .filter((q) => q.eq(q.field("isActive"), true))
      .order("desc")
      .first();

    return currentVersion;
  },
});
