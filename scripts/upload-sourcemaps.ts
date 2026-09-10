import { readdirSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

const output = resolve("dist");
function removeMaps(directory: string) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const target = join(directory, entry.name);
    if (entry.isDirectory()) removeMaps(target);
    else if (entry.name.endsWith(".map")) rmSync(target);
  }
}

function cli(args: string[]) {
  const result = spawnSync(process.execPath, ["x", "--no-install", "posthog-cli", "sourcemap", ...args], {
    stdio: "inherit",
    env: { ...process.env, POSTHOG_CLI_HOST: "https://eu.posthog.com", POSTHOG_CLI_PROJECT_ID: "145897" },
  });
  if (result.error || result.status !== 0) throw new Error("PostHog source-map processing failed; release must not be published.");
}

try {
  if (process.env.POSTHOG_CLI_API_KEY) {
    const release = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.VITE_APP_RELEASE;
    if (!release) throw new Error("Source-map upload requires VERCEL_GIT_COMMIT_SHA or VITE_APP_RELEASE.");
    cli(["inject", "--directory", output, "--release-name", "lighting-vtt", "--release-version", release]);
    cli(["upload", "--directory", output, "--release-name", "lighting-vtt", "--release-version", release]);
  } else {
    console.warn("PostHog source maps not uploaded: POSTHOG_CLI_API_KEY is not configured. Symbolication remains unverified.");
  }
} finally {
  // Never ship source contents to the static host, including on upload failure.
  removeMaps(output);
}
