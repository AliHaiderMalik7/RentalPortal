// Migration script to update existing tenancies to match new schema
import { internalMutation } from "../_generated/server";

export const updateExistingTenancies = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tenancies = await ctx.db.query("tenancies").collect();
    
    for (const tenancy of tenancies) {
      // Check if the tenancy needs updating
      if (tenancy.addressVerified === undefined) {
        await ctx.db.patch(tenancy._id, {
          freeReviewEligible: tenancy.freeReviewEligible ?? true,
          landlordReviewable: tenancy.landlordReviewable ?? true,
          mutualReviewAgreed: tenancy.mutualReviewAgreed ?? false,
          tenantVerified: tenancy.tenantVerified ?? false,
          landlordVerified: tenancy.landlordVerified ?? false,
          addressVerified: tenancy.addressVerified ?? false,
          documentsVerified: tenancy.documentsVerified ?? false,
          requires2FA: tenancy.requires2FA ?? false,
          resendCount: tenancy.resendCount ?? 0,
        });
      }
    }
    
    return { updated: tenancies.length };
  },
});
