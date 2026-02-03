// Tenant Invite Acceptance Flow - Simplified
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

export const acceptLandlordInvite = mutation({
  args: {
    inviteToken: v.string(),
    tenantUserId: v.id("users"),
    tenantCountry: v.string(),
    tenantRegion: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    disclaimerLogId: v.optional(v.id("complianceLogs")),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
    tenancyId: v.optional(v.id("tenancies")),
    requiresConfirmation: v.optional(v.boolean()),
  }),
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
        return {
          success: false,
          error:
            "Invitation has expired. Please contact your landlord for a new invitation.",
        };
      }

      // Check if already accepted by someone else
      if (tenancy.tenantId && tenancy.tenantId !== args.tenantUserId) {
        return {
          success: false,
          error: "This invitation has already been accepted by another user",
        };
      }

      // Update tenancy with tenant acceptance details
      await ctx.db.patch(tenancy._id, {
        tenantId: args.tenantUserId,
        tenantCountry: args.tenantCountry,
        tenantRegion: args.tenantRegion,
        ipAddressTenant: args.ipAddress,
        tenantDisclaimerLogId: args.disclaimerLogId,
        status: "pending_confirmation", // Tenant needs to confirm tenancy details
        tenantVerified: true,
        tenantAcceptedAt: Date.now(),
        updatedAt: Date.now(),
      });

      return {
        success: true,
        tenancyId: tenancy._id,
        requiresConfirmation: true,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to accept invitation",
      };
    }
  },
});

export const confirmTenancyDetails = mutation({
  args: {
    tenancyId: v.id("tenancies"),
    confirmed: v.boolean(),
    issues: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
    status: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      const tenancy = await ctx.db.get(args.tenancyId);

      if (!tenancy) {
        return { success: false, error: "Tenancy not found" };
      }

      if (args.confirmed) {
        // Tenant confirmed - make tenancy active
        await ctx.db.patch(args.tenancyId, {
          status: "active",
          addressVerified: true,
          confirmedAt: Date.now(),
          updatedAt: Date.now(),
        });

        return {
          success: true,
          status: "active",
        };
      } else {
        // Tenant flagged as incorrect - mark as disputed
        await ctx.db.patch(args.tenancyId, {
          status: "disputed",
          disputeRaised: true,
          disputeReason:
            args.issues || "Tenant flagged tenancy details as incorrect",
          disputeRaisedBy: "tenant",
          disputeRaisedAt: Date.now(),
          updatedAt: Date.now(),
        });

        return {
          success: true,
          status: "disputed",
        };
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to process tenancy confirmation",
      };
    }
  },
});

export const declineLandlordInvite = mutation({
  args: {
    inviteToken: v.string(),
    reason: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      const tenancy = await ctx.db
        .query("tenancies")
        .withIndex("by_invite_token", (q: any) =>
          q.eq("inviteToken", args.inviteToken),
        )
        .first();

      if (!tenancy) {
        return { success: false, error: "Invalid invite token" };
      }

      // Check if already expired
      if (tenancy.inviteTokenExpiry && tenancy.inviteTokenExpiry < Date.now()) {
        return { success: false, error: "Invitation has already expired" };
      }

      await ctx.db.patch(tenancy._id, {
        status: "declined",
        disputeRaised: args.reason ? true : false,
        disputeReason: args.reason,
        disputeRaisedBy: "tenant",
        disputeRaisedAt: Date.now(),
        updatedAt: Date.now(),
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to decline invitation",
      };
    }
  },
});

export const getTenancyByToken = query({
  args: { inviteToken: v.string() },
  handler: async (ctx, args) => {
    const tenancy = await ctx.db
      .query("tenancies")
      .withIndex("by_invite_token", (q: any) =>
        q.eq("inviteToken", args.inviteToken),
      )
      .first();

    if (!tenancy) return null;

    // Get related data
    const property = tenancy.propertyId
      ? await ctx.db.get(tenancy.propertyId)
      : null;
    const landlord = tenancy.landlordId
      ? await ctx.db.get(tenancy.landlordId)
      : null;

    return {
      ...tenancy,
      property,
      landlord,
    };
  },
});
