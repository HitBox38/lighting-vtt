/**
 * Convex auth providers.
 *
 * `CLERK_JWT_ISSUER_DOMAIN` must be set on the Convex deployment (dev and prod)
 * to the Clerk Frontend API URL, e.g. `https://your-app.clerk.accounts.dev`.
 * Clerk must also have a JWT template named `convex` (Clerk dashboard ->
 * JWT templates -> New template -> Convex); `ConvexProviderWithClerk` requests
 * tokens with that template name.
 */
const issuerDomain = process.env.CLERK_JWT_ISSUER_DOMAIN;

if (!issuerDomain) {
  throw new Error(
    "CLERK_JWT_ISSUER_DOMAIN is not set on this Convex deployment. " +
      "Run `npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<your-clerk-frontend-api>`.",
  );
}

export default {
  providers: [
    {
      domain: issuerDomain,
      applicationID: "convex",
    },
  ],
};
