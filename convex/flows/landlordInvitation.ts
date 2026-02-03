// Landlord Invitation Flow - Simplified
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

export const sendLandlordInvite = mutation({
  args: {
    tenancyId: v.id("tenancies"),
  },
  handler: async (ctx, args) => {
    try {
      // Get tenancy details
      const tenancy = await ctx.db.get(args.tenancyId);

      if (!tenancy) {
        return { success: false, error: "Tenancy not found" };
      }

      // TODO: Send actual email/SMS here
      // For now, just update status
      await ctx.db.patch(args.tenancyId, {
        status: "invited",
        lastResendAt: Date.now(),
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

export const getTenancyForInvite = query({
  args: { tenancyId: v.id("tenancies") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.tenancyId);
  },
});

export const updateInviteStatus = mutation({
  args: {
    tenancyId: v.id("tenancies"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.tenancyId, {
      // inviteStatus not in schema, using status instead
      status: "invited",
      lastResendAt: Date.now(),
    });
  },
});

export const acceptTenantInvite = mutation({
  args: {
    inviteToken: v.string(),
    tenantUserId: v.id("users"),
    tenantCountry: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Find tenancy by invite token
      const tenancy = await ctx.db
        .query("tenancies")
        .withIndex("by_invite_token", (q: any) =>
          q.eq("inviteToken", args.inviteToken),
        )
        .first();

      if (!tenancy) {
        return { success: false, error: "Invalid invite token" };
      }

      if (tenancy.inviteTokenExpiry && tenancy.inviteTokenExpiry < Date.now()) {
        return { success: false, error: "Invite expired" };
      }

      // Update tenancy with tenant info
      await ctx.db.patch(tenancy._id, {
        tenantId: args.tenantUserId,
        tenantCountry: args.tenantCountry,
        status: "pending_confirmation",
      });

      return {
        success: true,
        tenancyId: tenancy._id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
