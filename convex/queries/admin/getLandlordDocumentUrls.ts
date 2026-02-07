import { query } from "../../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getLandlordDocumentUrls = query({
  args: {
    landlordId: v.id("users"),
  },
  returns: v.object({
    _id: v.id("users"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    landlordLicenseUrls: v.optional(v.array(v.union(v.string(), v.null()))),
    proofOfAddressUrls: v.optional(v.array(v.union(v.string(), v.null()))),
    idVerificationDocsUrls: v.optional(v.array(v.union(v.string(), v.null()))),
    verified: v.optional(v.boolean()),
  }),
  handler: async (ctx, args) => {
    const adminUserId = await getAuthUserId(ctx);
    if (!adminUserId) {
      throw new Error("Not authenticated");
    }

    const adminUser = await ctx.db.get(adminUserId);
    if (adminUser?.roles !== "admin") {
      throw new Error("Unauthorized: Only admin can view landlord documents");
    }

    const landlord = await ctx.db.get(args.landlordId);
    if (!landlord || landlord.roles !== "landlord") {
      throw new Error("Landlord not found");
    }

    // Generate URLs for each document type
    const landlordLicenseUrls = landlord.landlordLicense 
      ? await Promise.all(
          landlord.landlordLicense.map(async (docId) => {
            try {
              return await ctx.storage.getUrl(docId);
            } catch (error) {
              console.error(`Failed to get URL for landlord license ${docId}:`, error);
              return null;
            }
          })
        )
      : [];

    const proofOfAddressUrls = landlord.proofOfAddress 
      ? await Promise.all(
          landlord.proofOfAddress.map(async (docId) => {
            try {
              return await ctx.storage.getUrl(docId);
            } catch (error) {
              console.error(`Failed to get URL for proof of address ${docId}:`, error);
              return null;
            }
          })
        )
      : [];

    const idVerificationDocsUrls = landlord.idVerificationDocs 
      ? await Promise.all(
          landlord.idVerificationDocs.map(async (docId) => {
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
      _id: landlord._id,
      firstName: landlord.firstName,
      lastName: landlord.lastName,
      landlordLicenseUrls: landlordLicenseUrls.filter(Boolean),
      proofOfAddressUrls: proofOfAddressUrls.filter(Boolean),
      idVerificationDocsUrls: idVerificationDocsUrls.filter(Boolean),
      verified: landlord.verified,
    };
  },
});
