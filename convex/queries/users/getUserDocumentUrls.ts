import { query } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getUserDocumentUrls = query({
  args: {},
  returns: v.object({
    landlordLicenseUrls: v.optional(v.array(v.union(v.string(), v.null()))),
    proofOfAddressUrls: v.optional(v.array(v.union(v.string(), v.null()))),
    idVerificationDocsUrls: v.optional(v.array(v.union(v.string(), v.null()))),
    verified: v.optional(v.boolean()),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Generate URLs for each document type
    const landlordLicenseUrls = user.landlordLicense 
      ? await Promise.all(
          user.landlordLicense.map(async (docId) => {
            try {
              return await ctx.storage.getUrl(docId);
            } catch (error) {
              console.error(`Failed to get URL for landlord license ${docId}:`, error);
              return null;
            }
          })
        )
      : [];

    const proofOfAddressUrls = user.proofOfAddress 
      ? await Promise.all(
          user.proofOfAddress.map(async (docId) => {
            try {
              return await ctx.storage.getUrl(docId);
            } catch (error) {
              console.error(`Failed to get URL for proof of address ${docId}:`, error);
              return null;
            }
          })
        )
      : [];

    const idVerificationDocsUrls = user.idVerificationDocs 
      ? await Promise.all(
          user.idVerificationDocs.map(async (docId) => {
            try {
              return await ctx.storage.getUrl(docId);
            } catch (error) {
              console.error(`Failed to get URL for ID verification ${docId}:`, error);
              return null;
            }
          })
        )
      : [];

    return {
      landlordLicenseUrls: landlordLicenseUrls.filter(Boolean),
      proofOfAddressUrls: proofOfAddressUrls.filter(Boolean),
      idVerificationDocsUrls: idVerificationDocsUrls.filter(Boolean),
      verified: user.verified,
    };
  },
});
