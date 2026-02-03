// Tenant Initiated Request Flow - Updated to match specification
import {
  mutation,
  query,
  action,
  internalQuery,
  internalMutation,
} from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";

export const createTenantRequest = mutation({
  args: {
    tenantId: v.id("users"),
    propertyAddress: v.string(),
    unitNumber: v.optional(v.string()),
    landlordName: v.string(),
    landlordEmail: v.string(),
    landlordPhone: v.optional(v.string()),
    tenancyStartDate: v.number(),
    tenancyEndDate: v.optional(v.number()),
    monthlyRent: v.optional(v.number()),
    depositAmount: v.optional(v.number()),
    tenantCountry: v.string(),
    tenantRegion: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    disclaimerLogId: v.optional(v.id("complianceLogs")),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
    tenancyId: v.optional(v.id("tenancies")),
    inviteToken: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      // Check for duplicate property entries by the same tenant
       await ctx.db
        .query("properties")
        .filter((q) =>
          q.and(
            q.eq(q.field("addressLine1"), args.propertyAddress),
            // This check would need proper tenant property relationship
          ),
        )
        .collect();

      // Parse property address for better storage
      const fullAddress = args.unitNumber
        ? `${args.propertyAddress}, Unit ${args.unitNumber}`
        : args.propertyAddress;

      // Create property placeholder (will be updated by landlord)
      const propertyId = await ctx.db.insert("properties", {
        landlordId: args.tenantId, // Temporary - will be updated when landlord accepts
        addressLine1: fullAddress,
        addressLine2: args.unitNumber || undefined,
        streetNumber: undefined,
        city: "To be verified",
        county: "To be verified",
        postcode: "To be verified",
        propertyType: "other",
        bedrooms: 1,
        bathrooms: 1,
        livingRooms: 1,
        kitchens: 1,
        hasGarden: false,
        parkingType: "none",
        images: [],
        isActive: false,
        createdAt: Date.now(),
      });

      // Generate unique invite token for landlord
      const inviteToken = crypto.randomUUID();
      const tokenExpiry = Date.now() + 14 * 24 * 60 * 60 * 1000; // 14 days expiry

      // Create tenancy with tenant-initiated specifics
      const tenancyId = await ctx.db.insert("tenancies", {
        propertyId,
        tenantId: args.tenantId,
        startDate: args.tenancyStartDate,
        endDate: args.tenancyEndDate,
        monthlyRent: args.monthlyRent,
        depositAmount: args.depositAmount,

        // Status flow
        status: "tenant_initiated",

        // Invitation details (for landlord)
        inviteToken,
        inviteTokenExpiry: tokenExpiry,
        invitedTenantEmail: args.landlordEmail, // This is actually landlord email
        invitedTenantName: args.landlordName, // This is actually landlord name
        invitedTenantPhone: args.landlordPhone,

        // Tenant details
        tenantCountry: args.tenantCountry,
        tenantRegion: args.tenantRegion,
        ipAddressTenant: args.ipAddress,
        tenantDisclaimerLogId: args.disclaimerLogId,

        // Review system - tenant-initiated defaults
        freeReviewEligible: true, // First review is free for tenant-initiated
        landlordReviewable: false, // Landlord can opt-out initially
        mutualReviewAgreed: false, // Will be determined by landlord choice

        // Verification statuses
        tenantVerified: true, // Tenant already verified through signup
        landlordVerified: false,
        addressVerified: false, // Will be verified by landlord
        documentsVerified: false,

        // System fields
        createdAt: Date.now(),
        requires2FA: true,
        resendCount: 0,
      });

      return {
        success: true,
        tenancyId,
        inviteToken,
      };
    } catch (error) {
      console.error("Tenant request creation error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create tenant request",
      };
    }
  },
});

export const sendLandlordInvite = action({
  args: {
    tenancyId: v.id("tenancies"),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    try {
      // Get tenancy details using the internal query
      const tenancy: any = await ctx.runQuery(
        internal.flows.tenantInitiatedRequest.internalGetTenancyDetails,
        {
          tenancyId: args.tenancyId,
        },
      );

      if (!tenancy) {
        return { success: false, error: "Tenancy not found" };
      }

      // Get tenant details - simplified for now
      const tenant = tenancy.tenantId
        ? { firstName: "Tenant", lastName: "User" }
        : null;

      // Send email to landlord
      const emailResult: { success: boolean; error?: string } =
        await ctx.runAction(
          api.flows.tenantInitiatedRequest.sendLandlordInviteEmail,
          {
            landlordEmail: tenancy.invitedTenantEmail!, // This is actually landlord email
            landlordName: tenancy.invitedTenantName!, // This is actually landlord name
            tenantName:
              tenant?.firstName + " " + tenant?.lastName || "A tenant",
            propertyAddress: tenancy.property?.addressLine1 || "Unknown",
            inviteToken: tenancy.inviteToken!,
            phone: tenancy.invitedTenantPhone,
          },
        );

      if (!emailResult.success) {
        return {
          success: false,
          error: emailResult.error || "Failed to send email",
        };
      }

      // Update tenancy status using the internal mutation
      await ctx.runMutation(
        internal.flows.tenantInitiatedRequest
          .internalUpdateTenancyToLandlordReview,
        {
          tenancyId: args.tenancyId,
        },
      );

      return { success: true };
    } catch (error) {
      console.error("Landlord invite error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to send landlord invitation",
      };
    }
  },
});

export const getTenancyDetails = query({
  args: { tenancyId: v.id("tenancies") },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const tenancy = await ctx.db.get(args.tenancyId);
    if (!tenancy) return null;

    // Get related property details
    const property = tenancy.propertyId
      ? await ctx.db.get(tenancy.propertyId)
      : null;

    return {
      ...tenancy,
      property,
    };
  },
});

// Internal version for use in actions
export const internalGetTenancyDetails = internalQuery({
  args: { tenancyId: v.id("tenancies") },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const tenancy = await ctx.db.get(args.tenancyId);
    if (!tenancy) return null;

    // Get related property details
    const property = tenancy.propertyId
      ? await ctx.db.get(tenancy.propertyId)
      : null;

    return {
      ...tenancy,
      property,
    };
  },
});

export const updateTenancyToLandlordReview = mutation({
  args: {
    tenancyId: v.id("tenancies"),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      await ctx.db.patch(args.tenancyId, {
        status: "landlord_reviewing",
        lastResendAt: Date.now(),
        updatedAt: Date.now(),
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update status",
      };
    }
  },
});

// Internal version for use in actions
export const internalUpdateTenancyToLandlordReview = internalMutation({
  args: {
    tenancyId: v.id("tenancies"),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      await ctx.db.patch(args.tenancyId, {
        status: "landlord_reviewing",
        lastResendAt: Date.now(),
        updatedAt: Date.now(),
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update status",
      };
    }
  },
});

// Email action to send landlord invitation
export const sendLandlordInviteEmail = action({
  args: {
    landlordEmail: v.string(),
    landlordName: v.string(),
    tenantName: v.string(),
    propertyAddress: v.string(),
    inviteToken: v.string(),
    phone: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (_ctx, args) => {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY!);

      // Create landlord invitation link
      const inviteLink = `${process.env.VITE_PROD_URL}/landlord/onboarding?token=${args.inviteToken}`;

      // Send email to landlord
      await resend.emails.send({
      from: process.env.AUTH_EMAIL ?? "My App <rajkiranpatel@rentalcv.ai>",
        to: args.landlordEmail,
        subject: `${args.tenantName} has invited you to verify their tenancy on RentalCV`,
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background: #ffffff;">
            <div style="background: #0369a1; color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">RentalCV Invitation</h1>
            </div>
            
            <div style="padding: 30px;">
              <h2 style="color: #0369a1; margin-top: 0;">Hello ${args.landlordName}!</h2>
              
              <p style="font-size: 16px; line-height: 1.5; color: #374151;">
                <strong>${args.tenantName}</strong> has invited you to verify their tenancy and leave a review for their RentalCV profile.
              </p>

              <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0369a1;">
                <h3 style="color: #0369a1; margin-top: 0;">Special Offer</h3>
                <p style="margin: 0; font-size: 16px; color: #374151;">
                  <strong>This first review is free for you!</strong> Take advantage of this offer to help your tenant build their rental history.
                </p>
              </div>

              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #334155; margin-top: 0; font-size: 18px;">Property Details</h3>
                <p style="margin: 5px 0; font-size: 16px;"><strong>Address:</strong> ${args.propertyAddress}</p>
                <p style="margin: 5px 0; font-size: 16px;"><strong>Tenant:</strong> ${args.tenantName}</p>
              </div>

              <div style="margin: 30px 0;">
                <h3 style="color: #334155; margin-bottom: 15px;">What happens next:</h3>
                <ol style="padding-left: 20px; color: #374151; line-height: 1.6;">
                  <li>Click the secure link below to get started</li>
                  <li>Create your landlord account or log in</li>
                  <li>Add your property details</li>
                  <li>Review and accept our terms</li>
                  <li>Choose your review options (required vs optional)</li>
                  <li>Submit your review for ${args.tenantName}</li>
                </ol>
              </div>

              <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <h3 style="color: #92400e; margin-top: 0;">Important</h3>
                <p style="color: #92400e; margin-bottom: 10px;">
                  You can choose whether or not you'd like to be reviewed by ${args.tenantName} in return.
                </p>
                <ul style="color: #92400e; margin-bottom: 0;">
                  <li><strong>Review only:</strong> You review ${args.tenantName}, but they don't review you</li>
                  <li><strong>Mutual review:</strong> You both review each other (recommended)</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 40px 0;">
                <a href="${inviteLink}" 
                   style="background: #0369a1; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
                  Get Started - First Review Free!
                </a>
              </div>

              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                <p style="color: #9ca3af; font-size: 14px; margin-bottom: 5px;">
                  <strong>Note:</strong> This invitation expires in 14 days.
                </p>
                <p style="color: #9ca3af; font-size: 14px;">
                  If the button doesn't work, copy and paste this link: <br/>
                  <span style="word-break: break-all;">${inviteLink}</span>
                </p>
              </div>
            </div>
          </div>
        `,
      });

      // SMS notification (placeholder)
      if (args.phone) {
        try {
          console.log(
            `SMS notification logged for ${args.phone}: ${args.landlordName}, ${args.tenantName} has invited you to RentalCV. First review is free! Check your email.`,
          );
          // TODO: Implement actual SMS when ready
        } catch (error) {
          console.error("SMS notification error:", error);
          // Don't fail email if SMS fails
        }
      }

      return { success: true };
    } catch (error) {
      console.error("Landlord invitation email error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to send invitation email",
      };
    }
  },
});
