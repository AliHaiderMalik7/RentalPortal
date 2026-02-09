// Verification Service - Simplified
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

export const generateVerificationCode = mutation({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("email_verification"),
      v.literal("phone_verification"),
      v.literal("2fa_login"),
      v.literal("password_reset"),
    ),
    method: v.union(
      v.literal("email"),
      v.literal("sms"),
      v.literal("authenticator"),
    ),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

      // Clean up old codes for this user and type
      const oldCodes = await ctx.db
        .query("verificationCodes")
        .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
        .filter((q: any) => q.eq(q.field("type"), args.type))
        .collect();

      for (const oldCode of oldCodes) {
        await ctx.db.delete(oldCode._id);
      }

      await ctx.db.insert("verificationCodes", {
        userId: args.userId,
        code,
        type: args.type,
        method: args.method,
        expiresAt,
        isUsed: false,
        attemptsCount: 0,
        createdAt: Date.now(),
        ipAddress: args.ipAddress,
        userAgent: args.userAgent,
      });

      return {
        success: true,
        code,
        expiresAt,
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to generate code",
      };
    }
  },
});

export const verifyCode = mutation({
  args: {
    userId: v.id("users"),
    code: v.string(),
    type: v.union(
      v.literal("email_verification"),
      v.literal("phone_verification"),
      v.literal("2fa_login"),
      v.literal("password_reset"),
    ),
  },
  handler: async (ctx, args) => {
    try {
      const codeRecord = await ctx.db
        .query("verificationCodes")
        .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
        .filter((q: any) =>
          q.and(
            q.eq(q.field("code"), args.code),
            q.eq(q.field("type"), args.type),
            q.eq(q.field("isUsed"), false),
          ),
        )
        .first();

      if (!codeRecord) {
        return {
          success: false,
          error: "Invalid code",
        };
      }

      if (codeRecord.expiresAt < Date.now()) {
        await ctx.db.delete(codeRecord._id);
        return {
          success: false,
          error: "Code expired",
        };
      }

      if (codeRecord.attemptsCount >= 5) {
        await ctx.db.delete(codeRecord._id);
        return {
          success: false,
          error: "Too many attempts",
        };
      }

      // Mark as used
      await ctx.db.patch(codeRecord._id, {
        isUsed: true,
      });

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: "Verification failed",
      };
    }
  },
});

export const getVerificationStatus = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);

    const activeCodes = await ctx.db
      .query("verificationCodes")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .filter((q: any) =>
        q.and(
          q.eq(q.field("isUsed"), false),
          q.gt(q.field("expiresAt"), Date.now()),
        ),
      )
      .collect();

    const pendingTypes = [
      ...new Set(activeCodes.map((code: any) => code.type)),
    ];

    return {
      emailVerified: user?.emailVerificationTime ? true : false,
      phoneVerified: user?.phoneVerificationTime ? true : false,
      pendingVerifications: pendingTypes,
    };
  },
});

export const cleanupExpiredCodes = mutation({
  args: {},
  handler: async (ctx) => {
    const expired = await ctx.db
      .query("verificationCodes")
      .withIndex("by_expiry", (q: any) => q.lt("expiresAt", Date.now()))
      .collect();

    for (const code of expired) {
      await ctx.db.delete(code._id);
    }

    return {
      cleaned: expired.length,
    };
  },
});
