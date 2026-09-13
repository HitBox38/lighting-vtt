import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

for (const saved of ["accepted", "rejected", "pending", "invalid", "unavailable"]) {
  test(`cookie UI respects ${saved} browser consent and permits changing the choice`, () => {
    const result = spawnSync(process.execPath, ["--tsconfig-override", "tsconfig.app.json", resolve(import.meta.dir, "fixtures/cookieConsent.tsx"), saved], { encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
  });
}
