import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

test("persistence telemetry follows mutation outcomes and scene visits", () => {
  // Isolate backend mocks from the Workshop suite's store fixtures.
  const result = spawnSync(process.execPath, [resolve(import.meta.dir, "fixtures/analyticsPersistence.ts")], { encoding: "utf8" });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain("Autosave transitions");
});
