export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
  enableEmailAuth: true, // Turns on native email/password auth
  enableEmailPasswordAuth: true,
} ;
