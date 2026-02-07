import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const deleteUserDocument = mutation({
  args: {
    documentType: v.union(
      v.literal("landlordLicense"),
      v.literal("proofOfAddress"), 
      v.literal("idVerificationDocs")
    ),
    documentIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Only allow deletion if not verified by admin
    if (user.verified === true) {
      throw new Error("Cannot delete documents after admin verification");
    }

    const documents = user[args.documentType] || [];
    if (args.documentIndex >= documents.length) {
      throw new Error("Document index out of range");
    }

    // Remove the document at the specified index
    const updatedDocuments = documents.filter((_, index) => index !== args.documentIndex);
    
    // Update user with new document array
    await ctx.db.patch(userId, {
      [args.documentType]: updatedDocuments,
      // Reset verification status if documents are deleted
      verified: undefined,
    });

    return { success: true };
  },
});
