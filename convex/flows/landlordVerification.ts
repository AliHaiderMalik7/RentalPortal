// Landlord Verification Flow - Simplified
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

export const verifyTenantRequest = mutation({
  args: {
    inviteToken: v.string(),
    landlordUserId: v.id("users"),
    agreeToReview: v.boolean(),
    agreeToBeReviewed: v.boolean(),
    landlordCountry: v.string(),
    landlordRegion: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    disclaimerLogId: v.optional(v.id("complianceLogs")),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
    tenancyId: v.optional(v.id("tenancies")),
    requiresReview: v.boolean(),
    isTenantInitiated: v.boolean(),
    freeReviewEligible: v.boolean(),
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
        return {
          success: false,
          error: "Invalid invite token",
          requiresReview: false,
          isTenantInitiated: false,
          freeReviewEligible: false,
        };
      }

      if (tenancy.inviteTokenExpiry && tenancy.inviteTokenExpiry < Date.now()) {
        return {
          success: false,
          error: "Invitation has expired",
          requiresReview: false,
          isTenantInitiated: false,
          freeReviewEligible: false,
        };
      }

      // Check if already verified
      if (tenancy.landlordId && tenancy.landlordId !== args.landlordUserId) {
        return {
          success: false,
          error:
            "This invitation has already been accepted by another landlord",
          requiresReview: false,
          isTenantInitiated: false,
          freeReviewEligible: false,
        };
      }

      const isTenantInitiated = tenancy.status === "tenant_initiated";

      // For tenant-initiated: agreeToReview is REQUIRED, agreeToBeReviewed is optional
      // For landlord-initiated: both are typically true by default
      if (!args.agreeToReview) {
        return {
          success: false,
          error: "You must agree to provide a review to proceed",
          requiresReview: false,
          isTenantInitiated,
          freeReviewEligible: tenancy.freeReviewEligible,
        };
      }

      // Update tenancy with landlord verification and choices
      await ctx.db.patch(tenancy._id, {
        landlordId: args.landlordUserId,
        landlordCountry: args.landlordCountry,
        ipAddressLandlord: args.ipAddress,
        landlordDisclaimerLogId: args.disclaimerLogId,
        status: "active", // Landlord verified, tenancy is active
        landlordVerified: true,
        landlordReviewable: args.agreeToBeReviewed,
        mutualReviewAgreed: args.agreeToReview && args.agreeToBeReviewed,
        confirmedAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Update property with correct landlord
      if (tenancy.propertyId) {
        await ctx.db.patch(tenancy.propertyId, {
          landlordId: args.landlordUserId,
          isActive: true,
        });
      }

      return {
        success: true,
        tenancyId: tenancy._id,
        requiresReview: args.agreeToReview,
        isTenantInitiated,
        freeReviewEligible: tenancy.freeReviewEligible,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to verify tenant request",
        requiresReview: false,
        isTenantInitiated: false,
        freeReviewEligible: false,
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
    const tenant = tenancy.tenantId ? await ctx.db.get(tenancy.tenantId) : null;

    return {
      ...tenancy,
      property,
      tenant,
    };
  },
});

export const declineTenantRequest = mutation({
  args: {
    inviteToken: v.string(),
    reason: v.optional(v.string()),
  },
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

      await ctx.db.patch(tenancy._id, {
        status: "declined",
        // notes field not in schema, storing in landlordNotes if available
        // notes: args.reason,
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
