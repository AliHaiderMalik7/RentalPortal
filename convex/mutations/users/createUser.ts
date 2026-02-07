import { mutation } from "../../_generated/server";
import { v } from "convex/values";

export const createUser = mutation({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.string(),
    gender: v.union(v.literal("male"), v.literal("female"), v.literal("other")),
    address: v.optional(v.string()),
    city: v.string(),
    state: v.string(),
    postalCode: v.string(),
    roles: v.union(
      v.literal("tenant"),
      v.literal("landlord"),
      v.literal("admin"),
    ),
  },
  handler: async (ctx, args) => {
    // Optional: check if user exists already
    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new Error("User already exists");
    }

    await ctx.db.insert("users", {
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      phone: args.phone,
      gender: args.gender,
      address: args.address,
      city: args.city,
      state: args.state,
      postalCode: args.postalCode,
      roles: args.roles,
      subscription: "basic",
      createdAt: Date.now(),
    });
  },
});
