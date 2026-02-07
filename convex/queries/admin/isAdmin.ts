import { query } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const isAdmin = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    
    if (!userId) {
      return false;
    }

    const user = await ctx.db.get(userId);
    
    if (!user) {
      return false;
    }

    return user.roles === "admin";
  },
});
