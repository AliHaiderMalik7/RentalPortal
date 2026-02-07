import { query } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getAllLandlords = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("users"),
    _creationTime: v.number(),
    email: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
        verified: v.optional(v.boolean()),
        emailVerified: v.optional(v.boolean()),
        landlordLicense: v.optional(v.array(v.id("_storage"))),
        proofOfAddress: v.optional(v.array(v.id("_storage"))),
        idVerificationDocs: v.optional(v.array(v.id("_storage"))),
        subscription: v.optional(v.union(
          v.literal("basic"),
          v.literal("standard"),
          v.literal("premium"),
        )),
        createdAt: v.optional(v.number()),
  })),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    const user = await ctx.db.get(userId);
    if (user?.roles !== "admin") {
      throw new Error("Unauthorized: Only admin can view landlords");
    }

    const landlords = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("roles", "landlord"))
      .collect();

    return landlords.map(landlord => ({
      _id: landlord._id,
      _creationTime: landlord._creationTime,
      email: landlord.email,
      firstName: landlord.firstName,
      lastName: landlord.lastName,
      phone: landlord.phone,
      city: landlord.city,
      state: landlord.state,
      verified: landlord.verified,
      emailVerified: landlord.emailVerified,
      landlordLicense: landlord.landlordLicense,
      proofOfAddress: landlord.proofOfAddress,
      idVerificationDocs: landlord.idVerificationDocs,
      subscription: landlord.subscription,
      createdAt: landlord.createdAt,
    }));
  },
});
