import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ResendOTPPasswordReset } from "./ResetOTPPasswordReset";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        return {
          email: params.email as string,
          emailVerified: false,
        };
      },
      reset: ResendOTPPasswordReset,
    }),
    Anonymous,
  ],
});

export const validateSession = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    return {
      isValid: !!identity,
      user: identity,
    };
  },
});

export const checkUserExists = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const userRecord = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    return {
      exists: !!userRecord,
      inUsersTable: !!userRecord,
    };
  },
});

export const updateUser = mutation({
  args: {
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    countryCode: v.optional(v.string()),
    gender: v.optional(
      v.union(v.literal("male"), v.literal("female"), v.literal("other")),
    ),
    address: v.optional(v.string()),
    streetNumber: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    roles: v.optional(
      v.union(v.literal("tenant"), v.literal("landlord"), v.literal("admin")),
    ),
    createdAt: v.optional(v.number()),
    idVerificationDocs: v.optional(v.array(v.id("_storage"))),
    proofOfAddress: v.optional(v.array(v.id("_storage"))),
    landlordLicense: v.optional(v.array(v.id("_storage"))),
    verified: v.optional(v.boolean()),
    profilePic: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    const userData = {
      firstName: args.firstName,
      lastName: args.lastName,
      phone: args.phone,
      countryCode: args.countryCode,
      gender: args.gender,
      address: args.address,
      streetNumber: args.streetNumber,
      city: args.city,
      state: args.state,
      postalCode: args.postalCode,
      roles: args.roles,
      idVerificationDocs: args.idVerificationDocs,
      proofOfAddress: args.proofOfAddress,
      landlordLicense: args.landlordLicense,
      verified: args.verified,
      profilePic: args.profilePic,
    };

    if (existing) {
      await ctx.db.patch(existing._id, userData);
      return { success: true, userId: existing._id, action: "updated" };
    } else {
      const userId = await ctx.db.insert("users", {
        ...args,
        subscription: "basic",
        createdAt: args.createdAt ?? Date.now(),
      });
      return { success: true, userId, action: "created" };
    }
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    return await ctx.db.get(userId);
  },
});

export const isEmailVerified = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return false;
    }
    const user = await ctx.db.get(userId);
    return user?.emailVerified ?? false;
  },
});

export const isTwoFactorEnabled = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return false;
    }
    const user = await ctx.db.get(userId);
    return user?.twoFactorEnabled ?? false;
  },
});

export const isProfileComplete = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return false;
    }
    const user = await ctx.db.get(userId);
    return !!(user?.firstName && user?.lastName && user?.roles);
  },
});

export const checkEmailVerifiedByEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();

    if (!user) {
      return { success: false, code: "USER_NOT_FOUND" };
    }

    if (!user.emailVerified) {
      return { success: false, code: "EMAIL_NOT_VERIFIED" };
    }

    return { success: true };
  },
});
