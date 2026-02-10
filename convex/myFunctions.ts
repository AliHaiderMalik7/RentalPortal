import { v } from "convex/values";
import {  mutation, action } from "./_generated/server";
import { api } from "./_generated/api";

// Admin Functions - These will be visible in your Convex dashboard

/**
 * Create Admin User
 * 
 * This mutation creates an admin user account.
 * Run this from the Convex dashboard to create the admin account.
 */
export const createAdminUser = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    credentials: v.object({
      email: v.string(),
      password: v.string(),
    }),
  }),
  handler: async (ctx) => {
    const adminEmail = "ad.rentalcv@gmail.com";
    const adminPassword = "admin123";
    
    // Check if admin already exists
    const existingAdmin = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", adminEmail))
      .first();

    if (existingAdmin) {
      return {
        success: false,
        message: "Admin user already exists",
        credentials: {
          email: adminEmail,
          password: adminPassword,
        },
      };
    }

    // Create admin user
    await ctx.db.insert("users", {
      email: adminEmail,
      firstName: "Admin",
      lastName: "User",
      phone: "+1234567890",
      gender: "other",
      address: "Admin Address",
      city: "Admin City",
      state: "Admin State",
      postalCode: "12345",
      roles: "admin",
      emailVerified: true, // Set as verified for admin
      verified: true,
      subscription: "premium",
      createdAt: Date.now(),
    });

    return {
      success: true,
      message: "Admin user created successfully! You can now log in.",
      credentials: {
        email: adminEmail,
        password: adminPassword,
      },
    };
  },
});

/**
 * Delete Admin User
 * 
 * This mutation removes the admin user so it can be recreated.
 * Run this if you need to recreate the admin account.
 */
export const deleteAdminUser = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx) => {
    const adminEmail = "ad.rentalcv@gmail.com";
    
    try {
      const adminUser = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", adminEmail))
        .first();

      if (adminUser) {
        await ctx.db.delete(adminUser._id);
        return {
          success: true,
          message: "Admin user deleted successfully. You can now recreate it.",
        };
      } else {
        return {
          success: false,
          message: "No admin user found to delete.",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Error deleting admin user: ${error.message}`,
      };
    }
  },
});

/**
 * Create Admin User with Proper Authentication
 * 
 * This action creates an admin user account using the proper authentication flow.
 * Run this action from the Convex dashboard to create the admin account.
 */
export const createAdminWithAuth = action({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    credentials: v.object({
      email: v.string(),
      password: v.string(),
    }),
  }),
  handler: async (ctx) => {
    const adminEmail = "ad.rentalcv@gmail.com";
    const adminPassword = "admin123";
    
    try {
      // Use the existing signup action to create the admin user
      // This ensures proper integration with the auth system
      const result = await ctx.runAction(api.actions.auth.createUser.signup, {
        email: adminEmail,
        firstName: "Admin",
        lastName: "User",
        phone: "+1234567890",
        gender: "other",
        address: "Admin Address",
        city: "Admin City",
        state: "Admin State",
        postalCode: "12345",
        roles: "admin",
      });

      if (result.success) {
        return {
          success: true,
          message: "Admin user created successfully with proper authentication!",
          credentials: {
            email: adminEmail,
            password: adminPassword,
          },
        };
      } else {
        return {
          success: false,
          message: "Failed to create admin user through signup",
          credentials: {
            email: adminEmail,
            password: adminPassword,
          },
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Error creating admin user: ${error.message}`,
        credentials: {
          email: adminEmail,
          password: adminPassword,
        },
      };
    }
  },
});