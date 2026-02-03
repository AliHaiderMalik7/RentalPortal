// Migration script to update existing reviews to match new schema
import { internalMutation } from "../_generated/server";

export const updateExistingReviews = internalMutation({
  args: {},
  handler: async (ctx) => {
    const reviews = await ctx.db.query("reviews").collect();

    for (const review of reviews) {
      // Check if the review needs updating (missing status field)
      if (!review.status) {
        // Map old isVerified to new status
        const status = (review as any).isVerified ? "approved" : "pending";
        await ctx.db.patch(review._id, {
          status,
        });
      }
    }

    return { updated: reviews.length };
  },
});