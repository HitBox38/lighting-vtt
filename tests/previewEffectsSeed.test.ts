import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const script = resolve(import.meta.dir, "../scripts/seed-preview-effects.mjs");
const archive = resolve(import.meta.dir, "../convex/seed/effects-library.zip");

function runSeeder(overrides: Record<string, string> = {}) {
  const directory = mkdtempSync(join(tmpdir(), "preview-seed-test-"));
  const trace = join(directory, "commands.jsonl");
  writeFileSync(join(directory, "bunx"), `#!${process.execPath}
import { appendFileSync } from "node:fs";
const args = process.argv.slice(2);
appendFileSync(process.env.SEED_TEST_TRACE, JSON.stringify(args) + "\\n");
if (args[2] === "data") {
  if (process.env.SEED_TEST_DATA_ERROR) process.exit(1);
  process.stdout.write(process.env.SEED_TEST_TABLES ?? "");
} else if (args[2] !== "import") {
  throw new Error("Unexpected Convex command: " + args.join(" "));
}
`, { mode: 0o755 });
  try {
    const result = spawnSync(process.execPath, [script], {
      cwd: directory,
      encoding: "utf8",
      env: {
        PATH: `${directory}:/usr/bin:/bin`,
        VERCEL_ENV: "preview",
        VERCEL_GIT_COMMIT_REF: "pre-prod",
        CONVEX_EFFECTS_SEED_ZIP: archive,
        SEED_TEST_TRACE: trace,
        ...overrides,
      },
    });
    const calls: string[][] = (() => {
      try {
        return readFileSync(trace, "utf8").trim().split("\n").map((line) => JSON.parse(line));
      } catch {
        return [];
      }
    })();
    return { ...result, calls };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("an initialized preview skips archive import even if its tables have no rows", () => {
  const result = runSeeder({ SEED_TEST_TABLES: "effects\nscenes\nuploadedFiles\n" });
  expect(result.status).toBe(0);
  expect(result.stdout).toContain("Preserving existing preview data and table IDs");
  expect(result.calls).toEqual([["--bun", "convex", "data", "--deployment", "preview/pre-prod"]]);
});

test("a fresh preview still imports the slim seed before its schema is created", () => {
  const result = runSeeder({ VERCEL_GIT_COMMIT_REF: "feature/effects" });
  expect(result.status).toBe(0);
  expect(result.calls).toHaveLength(2);
  expect(result.calls[1].slice(0, 3)).toEqual(["--bun", "convex", "import"]);
  expect(result.calls[1].slice(4)).toEqual(["--replace", "-y", "--deployment", "preview/feature-effects"]);
});

test("table inspection failure stops seeding without attempting an import", () => {
  const result = runSeeder({ SEED_TEST_DATA_ERROR: "true" });
  expect(result.status).not.toBe(0);
  expect(result.calls).toHaveLength(1);
  expect(result.calls[0][2]).toBe("data");
});

test("production and explicitly skipped builds never contact Convex", () => {
  for (const overrides of [{ VERCEL_ENV: "production" }, { CONVEX_SKIP_PREVIEW_EFFECT_SEED: "true" }]) {
    const result = runSeeder(overrides);
    expect(result.status).toBe(0);
    expect(result.calls).toEqual([]);
  }
});

test("a non-preview target is rejected before contacting Convex", () => {
  const result = runSeeder({ CONVEX_PREVIEW_SEED_DEPLOYMENT: "prod" });
  expect(result.status).not.toBe(0);
  expect(result.calls).toEqual([]);
});
