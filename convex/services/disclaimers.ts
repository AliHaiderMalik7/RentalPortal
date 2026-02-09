// Disclaimers Service - Simplified
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

export const getDisclaimerByRegion = query({
  args: {
    region: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const disclaimer = await ctx.db
      .query("disclaimerVersions")
      .withIndex("by_region", (q: any) => q.eq("region", args.region))
      .filter((q: any) => q.eq(q.field("category"), args.category || "general"))
      .filter((q: any) => q.eq(q.field("isActive"), true))
      .order("desc")
      .first();

    return disclaimer || null;
  },
});

export const logDisclaimerAcceptance = mutation({
  args: {
    userId: v.id("users"),
    disclaimerVersionId: v.optional(v.id("disclaimerVersions")), // Make optional to handle missing disclaimers
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    tenancyId: v.optional(v.id("tenancies")),
    region: v.optional(v.string()), // Add region for fallback
    category: v.optional(v.string()), // Add category for context
  },
  handler: async (ctx, args) => {
    let disclaimerVersion = "1.0";
    let disclaimerVersionId = args.disclaimerVersionId;

    // If no disclaimerVersionId provided, try to find or create a default one
    if (!disclaimerVersionId && args.region && args.category) {
      const existingDisclaimer = await ctx.db
        .query("disclaimerVersions")
        .withIndex("by_region", (q: any) => q.eq("region", args.region))
        .filter((q: any) => q.eq(q.field("category"), args.category))
        .filter((q: any) => q.eq(q.field("isActive"), true))
        .first();

      if (existingDisclaimer) {
        disclaimerVersionId = existingDisclaimer._id;
        disclaimerVersion = existingDisclaimer.version;
      } else {
        // Create a default disclaimer if none exists
        const validRegion =
          args.region === "US" ||
          args.region === "UK" ||
          args.region === "EU" ||
          args.region === "INTERNATIONAL"
            ? args.region
            : "INTERNATIONAL";
        const validCategory =
          args.category === "tenant_signup" ||
          args.category === "landlord_signup" ||
          args.category === "tenant_invite_acceptance" ||
          args.category === "landlord_verification"
            ? args.category
            : "tenant_signup";

        const properDisclaimerContent = getProperDisclaimerContent(
          validCategory,
          validRegion,
        );
        disclaimerVersionId = await ctx.db.insert("disclaimerVersions", {
          region: validRegion,
          category: validCategory,
          content: properDisclaimerContent,
          version: "1.0",
          isActive: true,
          changelog: "Auto-created disclaimer with proper content",
          createdAt: Date.now(),
          createdBy: args.userId,
        });
        disclaimerVersion = "1.0";
      }
    }

    return await ctx.db.insert("complianceLogs", {
      userId: args.userId,
      disclaimerVersionId,
      disclaimerVersion,
      timestamp: Date.now(),
      ip: args.ipAddress || "unknown",
      userAgent: args.userAgent || "unknown",
      device: "simplified",
      country: args.region || "unknown",
      acceptanceContext:
        args.category === "tenant_initiated_request"
          ? "tenant_initiated_request"
          : args.category === "landlord_verification"
            ? "landlord_verification"
            : args.category === "tenant_invite_acceptance"
              ? "tenant_invite_acceptance"
              : "tenant_signup",
      retentionExpiryDate: Date.now() + 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
      relatedTenancyId: args.tenancyId,
      isArchived: false,
    });
  },
});

export const getUserComplianceLogs = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("complianceLogs")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// Helper function to get proper disclaimer content
function getProperDisclaimerContent(category: string, region: string): string {
  const baseContent = {
    tenant_invite_acceptance: `
      <h3>RentalCV Terms of Service - Tenant Invitation Acceptance</h3>
      <p>By accepting this landlord invitation and using RentalCV, you agree to the following terms:</p>
      <ol>
        <li>You confirm that the tenancy information provided by your landlord is accurate</li>
        <li>You consent to your landlord reviewing your tenancy performance</li>
        <li>You understand that reviews will be publicly visible on your RentalCV profile</li>
        <li>You agree to provide honest and factual information about any disputes or issues</li>
        <li>You understand that false information may result in account termination</li>
        <li>You agree to RentalCV's data processing and privacy policies</li>
        <li>You understand that this service helps build your rental credibility</li>
      </ol>
      <p>This agreement helps create a transparent rental history that benefits future tenancy applications.</p>
    `,
    tenant_initiated_request: `
      <h3>RentalCV Terms - Tenant-Initiated Request</h3>
      <p>By submitting this landlord invitation request, you agree to:</p>
      <ol>
        <li>Provide accurate property and landlord information</li>
        <li>Consent to your landlord reviewing your tenancy performance</li>
        <li>Allow your landlord to choose whether to be reviewed in return</li>
        <li>Understand that your first review through this process is free for your landlord</li>
        <li>Acknowledge that reviews will be visible on your public RentalCV profile</li>
        <li>Take responsibility for any false or misleading information provided</li>
      </ol>
      <p><strong>Important:</strong> Your landlord will have the choice to:</p>
      <ul>
        <li>Review you only (they don't get reviewed back)</li>
        <li>Engage in mutual reviews (both review each other)</li>
      </ul>
    `,
    landlord_verification: `
      <h3>RentalCV Terms - Landlord Verification</h3>
      <p>By proceeding with this verification, you agree to:</p>
      <ol>
        <li>Verify the accuracy of the tenancy information provided</li>
        <li>Provide honest and factual reviews based on actual tenancy experience</li>
        <li>Respect tenant privacy and provide constructive feedback</li>
        <li>Understand that reviews will be publicly visible</li>
        <li>Comply with fair housing and anti-discrimination laws</li>
        <li>Take responsibility for the accuracy of information provided</li>
      </ol>
    `,
    tenant_signup: `
      <h3>RentalCV Terms of Service - Tenant</h3>
      <p>By creating a tenant account, you agree to:</p>
      <ol>
        <li>Provide accurate personal and rental information</li>
        <li>Maintain up-to-date profile information</li>
        <li>Use the platform responsibly and honestly</li>
        <li>Respect other users and maintain professional communication</li>
        <li>Comply with all applicable laws and regulations</li>
      </ol>
    `,
  };

  let content =
    baseContent[category as keyof typeof baseContent] ||
    baseContent.tenant_signup;

  // Add region-specific legal notices
  const regionalNotice = getRegionalLegalNotice(region);
  content += regionalNotice;

  return content;
}

function getRegionalLegalNotice(region: string): string {
  switch (region) {
    case "US":
      return `<p class="legal-notice"><strong>US Legal Notice:</strong> This agreement is governed by US federal and state laws. Your data will be processed in compliance with applicable US privacy laws.</p>`;
    case "UK":
      return `<p class="legal-notice"><strong>UK Legal Notice:</strong> This agreement is governed by UK law. Your data will be processed in compliance with UK GDPR and Data Protection Act 2018.</p>`;
    case "EU":
      return `<p class="legal-notice"><strong>EU Legal Notice:</strong> This agreement is governed by EU law. Your data will be processed in compliance with GDPR and applicable EU privacy regulations.</p>`;
    default:
      return `<p class="legal-notice"><strong>Legal Notice:</strong> This agreement is governed by international best practices. Your data will be processed in compliance with applicable privacy laws.</p>`;
  }
}

// Seed initial disclaimers
export const seedInitialDisclaimers = mutation({
  args: { adminUserId: v.optional(v.id("users")) },
  returns: v.object({
    success: v.boolean(),
    created: v.number(),
  }),
  handler: async (ctx, args) => {
    // Find any user to use as the creator, or use the provided adminUserId
    const creatorId =
      args.adminUserId || (await ctx.db.query("users").first())?._id;

    if (!creatorId) {
      return { success: false, created: 0 };
    }

    const regions = ["US", "UK", "EU", "INTERNATIONAL"] as const;
    const categories = [
      "tenant_signup",
      "landlord_signup",
      "tenant_invite_acceptance",
      "landlord_verification",
    ] as const;

    let created = 0;

    for (const region of regions) {
      for (const category of categories) {
        // Check if disclaimer already exists
        const existing = await ctx.db
          .query("disclaimerVersions")
          .withIndex("by_region", (q) => q.eq("region", region))
          .filter((q) => q.eq(q.field("category"), category))
          .filter((q) => q.eq(q.field("isActive"), true))
          .first();

        if (!existing) {
          const content = getProperDisclaimerContent(category, region);
          await ctx.db.insert("disclaimerVersions", {
            region,
            category,
            content,
            version: "1.0",
            isActive: true,
            changelog: "Initial seeded disclaimer",
            createdAt: Date.now(),
            createdBy: creatorId,
          });
          created++;
        }
      }
    }

    return { success: true, created };
  },
});

export const createDisclaimerVersion = mutation({
  args: {
    region: v.union(
      v.literal("US"),
      v.literal("UK"),
      v.literal("EU"),
      v.literal("INTERNATIONAL"),
    ),
    category: v.union(
      v.literal("tenant_signup"),
      v.literal("landlord_signup"),
      v.literal("tenant_invite_acceptance"),
      v.literal("landlord_verification"),
    ),
    content: v.string(),
    version: v.string(),
    isActive: v.boolean(),
    createdBy: v.id("users"),
    changelog: v.string(),
  },
  handler: async (ctx, args) => {
    // Deactivate previous versions if this is active
    if (args.isActive) {
      const existing = await ctx.db
        .query("disclaimerVersions")
        .withIndex("by_region", (q: any) => q.eq("region", args.region))
        .filter((q: any) => q.eq(q.field("category"), args.category))
        .filter((q: any) => q.eq(q.field("isActive"), true))
        .collect();

      for (const old of existing) {
        await ctx.db.patch(old._id, { isActive: false });
      }
    }

    return await ctx.db.insert("disclaimerVersions", {
      region: args.region,
      category: args.category,
      content: args.content,
      version: args.version,
      isActive: args.isActive,
      changelog: args.changelog,
      createdAt: Date.now(),
      createdBy: args.createdBy,
    });
  },
});
