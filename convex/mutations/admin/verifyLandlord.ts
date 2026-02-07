import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const verifyLandlord = mutation({
  args: {
    landlordId: v.id("users"),
    verified: v.boolean(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user || user.roles !== "admin") {
      throw new Error("Only admin can verify landlords");
    }

    const landlord = await ctx.db.get(args.landlordId);
    if (!landlord || landlord.roles !== "landlord") {
      throw new Error("Landlord not found");
    }

    // Update landlord verification status
    await ctx.db.patch(args.landlordId, {
      verified: args.verified,
    });

    return {
      success: true,
      message: `Landlord ${args.verified ? "verified" : "unverified"} successfully`,
    };
  },
});
