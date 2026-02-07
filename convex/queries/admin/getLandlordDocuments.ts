import { query } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getLandlordDocuments = query({
  args: {
    landlordId: v.id("users"),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("users"),
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      email: v.optional(v.string()),
      landlordLicense: v.optional(v.array(v.id("_storage"))),
      proofOfAddress: v.optional(v.array(v.id("_storage"))),
      idVerificationDocs: v.optional(v.array(v.id("_storage"))),
      verified: v.optional(v.boolean()),
      emailVerified: v.optional(v.boolean()),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user || user.roles !== "admin") {
      throw new Error("Only admin can view landlord documents");
    }

    const landlord = await ctx.db.get(args.landlordId);
    if (!landlord || landlord.roles !== "landlord") {
      return null;
    }

    return {
      _id: landlord._id,
      firstName: landlord.firstName,
      lastName: landlord.lastName,
      email: landlord.email,
      landlordLicense: landlord.landlordLicense,
      proofOfAddress: landlord.proofOfAddress,
      idVerificationDocs: landlord.idVerificationDocs,
      verified: landlord.verified,
      emailVerified: landlord.emailVerified,
    };
  },
});
