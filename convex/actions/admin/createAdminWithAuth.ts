"use node";

import { action } from "../../_generated/server";
import { v } from "convex/values";
import { api } from "../../_generated/api";

/**
 * Create Admin User with Proper Authentication
 * 
 * This action creates an admin user account using the proper authentication flow.
 * It uses the same signup process as regular users but with admin role.
 * 
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
          message: "Admin user created successfully with proper authentication! Email is automatically verified for admin users.",
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
