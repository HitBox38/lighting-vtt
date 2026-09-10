import type { TestConvex } from "convex-test";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type schema from "../../convex/schema";

// The package's test helper uses Vite's import.meta.glob; load it for Bun here.
export async function registerRateLimiter(t: TestConvex<typeof schema>) {
  const root = join(import.meta.dir, "../../node_modules/@convex-dev/rate-limiter/src/component");
  const modules = Object.fromEntries(
    [...new Bun.Glob("**/*.ts").scanSync(root)]
      .filter((path) => !path.endsWith(".d.ts"))
      .map((path) => [
        "./component/" + path.replaceAll("\\", "/"),
        () => import(pathToFileURL(join(root, path)).href),
      ]),
  );
  t.registerComponent("rateLimiter", (await import(pathToFileURL(join(root, "schema.ts")).href)).default, modules);
}
