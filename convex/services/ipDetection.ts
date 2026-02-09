// IP Detection Service - Enhanced
import { action, mutation, query } from "../_generated/server";
import { v } from "convex/values";

export const detectCountryFromIP = action({
  args: { ipAddress: v.string() },
  returns: v.object({
    success: v.boolean(),
    country: v.optional(v.string()),
    countryCode: v.optional(v.string()),
    region: v.optional(v.string()),
    city: v.optional(v.string()),
    timezone: v.optional(v.string()),
    cached: v.optional(v.boolean()),
    error: v.optional(v.string()),
  }),
  handler: async (_ctx, args) => {
    try {
      // Skip detection for local/private IPs
      if (
        args.ipAddress === "127.0.0.1" ||
        args.ipAddress.startsWith("192.168.") ||
        args.ipAddress.startsWith("10.") ||
        args.ipAddress.startsWith("172.") ||
        args.ipAddress === "localhost"
      ) {
        return {
          success: true,
          country: "United States",
          countryCode: "US",
          region: "US",
          city: "Unknown",
          timezone: "America/New_York",
          cached: false,
        };
      }

      // Use ip-api.com
      const response = await fetch(
        `http://ip-api.com/json/${args.ipAddress}?fields=status,message,country,countryCode,region,regionName,city,timezone`,
      );
      const data = await response.json();

      if (data.status !== "success") {
        console.error("IP detection API error:", data.message);
        return {
          success: true,
          country: "United States",
          countryCode: "US",
          region: "US",
          city: "Unknown",
          timezone: "America/New_York",
          cached: false,
        };
      }

      const regionCode = mapCountryToRegion(data.country);

      return {
        success: true,
        country: data.country,
        countryCode: data.countryCode,
        region: regionCode,
        city: data.city,
        timezone: data.timezone,
        cached: false,
      };
    } catch (error) {
      console.error("IP detection failed:", error);
      return {
        success: true,
        country: "United States",
        countryCode: "US",
        region: "US",
        city: "Unknown",
        timezone: "America/New_York",
        cached: false,
      };
    }
  },
});


// Helper function to map countries to legal regions
function mapCountryToRegion(country: string): string {
  const regionMapping: Record<string, string> = {
    // US
    "United States": "US",
    US: "US",

    // UK
    "United Kingdom": "UK",
    UK: "UK",
    England: "UK",
    Scotland: "UK",
    Wales: "UK",
    "Northern Ireland": "UK",

    // EU Countries
    Germany: "EU",
    France: "EU",
    Spain: "EU",
    Italy: "EU",
    Netherlands: "EU",
    Belgium: "EU",
    Austria: "EU",
    Portugal: "EU",
    Poland: "EU",
    Sweden: "EU",
    Denmark: "EU",
    Finland: "EU",
    Ireland: "EU",
    "Czech Republic": "EU",
    Hungary: "EU",
    Slovakia: "EU",
    Slovenia: "EU",
    Estonia: "EU",
    Latvia: "EU",
    Lithuania: "EU",
    Luxembourg: "EU",
    Malta: "EU",
    Cyprus: "EU",
    Bulgaria: "EU",
    Romania: "EU",
    Croatia: "EU",
    Greece: "EU",
  };

  return regionMapping[country] || "INTERNATIONAL";
}

export const getCachedLocation = query({
  args: { ipAddress: v.string() },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("ipLocationCache")
      .withIndex("by_ip", (q: any) => q.eq("ipAddress", args.ipAddress))
      .first();

    return cached || null;
  },
});

export const cacheLocation = mutation({
  args: {
    ipAddress: v.string(),
    country: v.string(),
    countryCode: v.string(),
    region: v.string(),
    city: v.string(),
    timezone: v.string(),
    provider: v.string(),
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("ipLocationCache")
      .withIndex("by_ip", (q: any) => q.eq("ipAddress", args.ipAddress))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        country: args.country,
        countryCode: args.countryCode,
        region: args.region,
        city: args.city,
        timezone: args.timezone,
        provider: args.provider,
        confidence: args.confidence,
        lastUsedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("ipLocationCache", {
      ipAddress: args.ipAddress,
      country: args.country,
      countryCode: args.countryCode,
      region: args.region,
      city: args.city,
      timezone: args.timezone,
      provider: args.provider,
      confidence: args.confidence,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    });
  },
});

export const updateCacheUsage = mutation({
  args: { ipAddress: v.string() },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query("ipLocationCache")
      .withIndex("by_ip", (q: any) => q.eq("ipAddress", args.ipAddress))
      .first();

    if (cached) {
      await ctx.db.patch(cached._id, {
        lastUsedAt: Date.now(),
      });
    }
  },
});
