import { expect, test } from "bun:test";
import { main, readThumbnailStatus, repairThumbnails } from "../scripts/repair-shader-thumbnails.mjs";

const missing = { effectId: "shader", latest: { ready: false, status: "missing" }, published: { ready: false, status: "missing" } };
const ready = { effectId: "shader", latest: { ready: true, status: "ready" }, published: { ready: true, status: "ready" } };

function fixture({ enabled = false, probeFails = false, states = [[missing], [ready]], pages = 1 } = {}) {
  const calls: string[][] = [];
  let reads = 0, backfills = 0;
  const run = async (args: string[]) => {
    calls.push(args);
    if (args[0] === "env") {
      if (args[1] === "get") return String(enabled);
      enabled = true;
      return "";
    }
    if (args.includes("--inline-query")) return JSON.stringify({ done: true, cursor: "", effects: states[Math.min(reads++, states.length - 1)] });
    if (args[1] === "thumbnailDiagnostics:probe") {
      if (probeFails) throw new Error("native renderer failed");
      return JSON.stringify({ images: [{ name: "fixture" }] });
    }
    if (args[1] === "thumbnails:backfill") return JSON.stringify({ done: ++backfills === pages, cursor: `page-${backfills}`, requested: 1 });
    throw new Error(`Unexpected command: ${args}`);
  };
  return { calls, run };
}

test("reports the production failure pattern without changing configuration or data", async () => {
  const f = fixture();
  const result = await repairThumbnails({ run: f.run });
  expect(result.enabled).toBe(false);
  expect(result.complete).toBe(false);
  expect(result.effects).toEqual([missing]);
  expect(f.calls.every(args => args[1] === "get" || args.includes("--inline-query"))).toBe(true);
});

test("failed renderer probe cannot enable generation or start backfill", async () => {
  const f = fixture({ probeFails: true });
  await expect(repairThumbnails({ run: f.run, apply: true })).rejects.toThrow("native renderer failed");
  expect(f.calls.some(args => args[1] === "set" || args[1] === "thumbnails:backfill")).toBe(false);
});

test("probe precedes activation and every backfill page; completion waits for both versions", async () => {
  const f = fixture({ pages: 2, states: [[missing], [{ ...ready, published: missing.published }], [ready]] });
  const result = await repairThumbnails({ run: f.run, apply: true, sleep: async () => {} });
  expect(result.complete).toBe(true);
  const commands = f.calls.map(args => args[1]);
  expect(commands.indexOf("thumbnailDiagnostics:probe")).toBeLessThan(commands.indexOf("set"));
  expect(commands.indexOf("set")).toBeLessThan(commands.indexOf("thumbnails:backfill"));
  const pages = f.calls.filter(args => args[1] === "thumbnails:backfill");
  expect(pages.map(args => JSON.parse(args[2]))).toEqual([{ retryFailed: true }, { retryFailed: true, cursor: "page-1" }]);
  expect(f.calls.filter(args => args.includes("--inline-query"))).toHaveLength(3);
});

test("enabled, complete deployments do not rerender images", async () => {
  const f = fixture({ enabled: true, states: [[ready]] });
  expect((await repairThumbnails({ run: f.run, apply: true })).complete).toBe(true);
  expect(f.calls).toHaveLength(2);
});

test("terminal job failures and pending jobs at the deadline are failures, not completed repairs", async () => {
  const failed = { ...missing, latest: { ready: false, status: "failed", failureCategory: "shader" } };
  const f = fixture({ states: [[missing], [failed]] });
  await expect(repairThumbnails({ run: f.run, apply: true })).rejects.toThrow("shader");
  const pending = fixture({ states: [[missing]] });
  await expect(repairThumbnails({ run: pending.run, apply: true, timeoutMs: 0 })).rejects.toThrow("deadline");
});

test("inspection reads all pages, including missing shaders beyond the first page", async () => {
  const queries: string[] = [];
  const result = await readThumbnailStatus(async (args: string[]) => {
    if (args[0] === "env") return "true";
    queries.push(args[2]);
    return JSON.stringify(queries.length === 1
      ? { done: false, cursor: 'next"page', effects: [ready] }
      : { done: true, cursor: "", effects: [missing] });
  });
  expect(result.complete).toBe(false);
  expect(result.effects).toHaveLength(2);
  expect(queries[1]).toContain(JSON.stringify('next"page'));
});

test("CLI requires an explicit deployment and rejects unknown options before invoking Convex", async () => {
  await expect(main([])).rejects.toThrow("Usage:");
  await expect(main(["--apply"])).rejects.toThrow("Usage:");
  await expect(main(["--deployment", "dev", "--prod"])).rejects.toThrow("Usage:");
  await expect(main(["--deployment", "dev", "--timeout-seconds", "NaN"])).rejects.toThrow("Usage:");
});
