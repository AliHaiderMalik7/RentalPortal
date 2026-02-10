import { mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Resend } from "resend";

// Generate email verification token
export const generateEmailVerificationToken = mutation({
  args: { email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    if (!userId && args.email) {
      const user = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", args.email))
        .unique();

      if (!user) {
        throw new Error("User not found");
      }
      const token = crypto.randomUUID();
      const expires = Date.now() + 14 * 24 * 60 * 60 * 1000; // 24 hours
      await ctx.db.patch(user._id, {
        emailVerificationToken: token,
        emailVerificationExpires: expires,
        emailVerified: false,
      });

      return token;
    } else if (!userId) {
      throw new Error("Not authenticated and no email provided");
    }

    const token = crypto.randomUUID();
    const expires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    await ctx.db.patch(userId, {
      emailVerificationToken: token,
      emailVerificationExpires: expires,
      emailVerified: false,
    });

    return token;
  },
});

// Verify email with token
export const verifyEmail = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email_verification_token", (q) =>
        q.eq("emailVerificationToken", args.token)
      )
      .unique();

    if (!user) {
      throw new Error("Invalid verification token");
    }

    if ((!user.emailVerificationExpires || user.emailVerificationExpires < Date.now()) && user.emailVerified === false) {
      return { success: false, email: user.email, error: "⏰ Your verification link has expired." };
    }

    if (user.emailVerified) {
      return { success: true, alreadyVerified: true };
    }

    await ctx.db.patch(user._id, {
      emailVerified: true,
      emailVerificationTime: Date.now(),
    });

    return { success: true };
  },
});

// Send verification email (action to use external email service)
export const sendVerificationEmail = action({
  args: { email: v.string(), token: v.string() },
  // @ts-ignore
  handler: async (ctx, args) => {
    const verificationLink = `${process.env.VITE_PROD_URL}/verify-email?token=${args.token}`;
    console.log("verication Link", verificationLink, process.env.AUTH_EMAIL);
      

    
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.AUTH_EMAIL ?? "My App <rajkiranpatel@rentalcv.ai>",
      to: args.email,
      subject: "Verify your email address",
      html: `
        <h1>Verify your email address</h1>
        <p>Click the link below to verify your email:</p>
        <a href="${verificationLink}">Verify Email</a>
        <p>This link will expire in 14 days.</p>
      `,
    });

    console.log("error is", error);
    

    return { success: true };
  },
});
