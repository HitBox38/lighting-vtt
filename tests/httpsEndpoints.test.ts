import { expect, test } from "bun:test";
import { validateProductionEndpoints } from "../scripts/validate-endpoints";

const endpoints = {
  VITE_CONVEX_URL: "https://example.convex.cloud",
  VITE_CONVEX_SITE_URL: "https://example.convex.site",
  VITE_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
};

test("accepts HTTPS endpoints and the optional PostHog default", () => {
  expect(() => validateProductionEndpoints(endpoints)).not.toThrow();
  expect(() => validateProductionEndpoints({
    ...endpoints, VITE_PUBLIC_POSTHOG_HOST: undefined,
  })).not.toThrow();
});

for (const name of Object.keys(endpoints)) {
  test(`${name} rejects insecure and invalid build endpoints`, () => {
    for (const value of ["http://example.com", "http://localhost:3210", "ws://example.com", "//example.com", "/api", "invalid"]) {
      expect(() => validateProductionEndpoints({ ...endpoints, [name]: value })).toThrow(name);
    }
  });
}

for (const name of ["VITE_CONVEX_URL", "VITE_CONVEX_SITE_URL"]) {
  test(`${name} is required for builds`, () => {
    for (const value of [undefined, ""]) {
      expect(() => validateProductionEndpoints({ ...endpoints, [name]: value })).toThrow(`Missing ${name}`);
    }
  });
}
