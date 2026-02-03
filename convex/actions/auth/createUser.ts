"use node";

import { action } from "../../_generated/server";
import { v } from "convex/values";
import { api } from "../../_generated/api";

export const signup = action({
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
    // const hashedPassword = await bcrypt.hash(args.password, 10);

    // Call the actual Mutation to store user in DB
    await ctx.runMutation(api.mutations.users.createUser.createUser, {
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
    });

    return { success: true };
  },
});


