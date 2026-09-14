import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

// Run with the authenticated Convex CLI, never expose diagnostics publicly.
// Each page is bounded and each job/version lookup uses an existing index.
export function thumbnailStatusQuery(cursor = null) {
  return `
    const page = await ctx.db.query("effects").paginate({ cursor: ${JSON.stringify(cursor)}, numItems: 25 });
    const effects = [];
    const exists = async id => !!id && !!(await ctx.db.system.get(id));
    for (const effect of page.page) {
      if (effect.kind !== "shader") continue;
      const job = async target => ctx.db.query("effectThumbnails").withIndex("by_effectId_target", q => q.eq("effectId", effect._id).eq("target", target)).unique();
      const latest = await job(undefined);
      const publicVersion = effect.visibility === "public" ? effect.publishedVersion : undefined;
      let published = null;
      if (publicVersion !== undefined) {
        const version = await ctx.db.query("effectVersions").withIndex("by_effect_version", q => q.eq("effectId", effect._id).eq("version", publicVersion)).unique();
        const publicJob = publicVersion === effect.latestVersion ? latest : await job("published");
        const image = effect.releasedCatalog?.thumbnailStorageId;
        published = {
          // Older releases predate per-version image references. Their release
          // snapshot is authoritative unless a version reference contradicts it.
          ready: !!version && !!image && (!version.generatedThumbnailStorageId || image === version.generatedThumbnailStorageId) && await exists(image),
          status: publicJob?.status ?? "missing",
          failureCategory: publicJob?.failureCategory ?? null,
        };
      }
      effects.push({
        effectId: effect._id, name: effect.name, latestVersion: effect.latestVersion,
        publishedVersion: publicVersion ?? null,
        latest: {
          ready: latest?.status === "ready" && latest.renderedVersion === effect.latestVersion &&
            latest.renderedRevision === latest.rendererRevision && await exists(latest.storageId),
          status: latest?.status ?? "missing",
          failureCategory: latest?.failureCategory ?? null,
        },
        published,
      });
    }
    return { done: page.isDone, cursor: page.continueCursor, effects };
  `;
}

export async function readThumbnailStatus(run) {
  const enabled = (await run(["env", "get", "EFFECT_THUMBNAILS_ENABLED"])).trim() === "true";
  const effects = [];
  let cursor = null;
  while (true) {
    const page = JSON.parse(await run(["run", "--inline-query", thumbnailStatusQuery(cursor)]));
    effects.push(...page.effects);
    if (page.done) break;
    cursor = page.cursor;
  }
  return { enabled, complete: enabled && effects.every(e => e.latest.ready && (!e.published || e.published.ready)), effects };
}

export async function repairThumbnails({ run, apply = false, timeoutMs = 600_000, sleep = setTimeout, log = () => {} }) {
  let status = await readThumbnailStatus(run);
  log(status);
  if (!apply || status.complete) return status;

  // A successful build does not prove that the native renderer runs, and a
  // successful backfill only means jobs were requested. Verify both boundaries.
  await run(["run", "thumbnailDiagnostics:probe", JSON.stringify({ effects: true, freshCache: true })]);
  if (!status.enabled) await run(["env", "set", "EFFECT_THUMBNAILS_ENABLED", "true"]);
  let cursor;
  do {
    const page = JSON.parse(await run(["run", "thumbnails:backfill", JSON.stringify({ retryFailed: true, ...(cursor ? { cursor } : {}) })]));
    cursor = page.done ? undefined : page.cursor;
  } while (cursor);

  const deadline = Date.now() + timeoutMs;
  while (true) {
    status = await readThumbnailStatus(run);
    log(status);
    if (status.complete) return status;
    if (!status.enabled) throw new Error("Thumbnail generation was disabled during repair");
    const failures = status.effects.flatMap(e => [e.latest, e.published]
      .filter(job => job && !job.ready && ["failed", "canceled"].includes(job.status))
      .map(job => `${e.effectId}: ${job.failureCategory ?? job.status}`));
    if (failures.length) throw new Error(`Thumbnail jobs failed: ${failures.join(", ")}`);
    if (Date.now() >= deadline) throw new Error("Thumbnail repair deadline exceeded; queued jobs may still finish. Re-run without --apply to inspect.");
    await sleep(3000);
  }
}

export async function main(args) {
  const usage = "Usage: bun run thumbnails:repair --deployment <name|prod|dev> [--apply] [--timeout-seconds <seconds>]";
  let deployment, apply = false, timeoutMs = 600_000;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--deployment") deployment = args[++i];
    else if (args[i] === "--apply") apply = true;
    else if (args[i] === "--timeout-seconds") timeoutMs = Number(args[++i]) * 1000;
    else throw new Error(usage);
  }
  if (!deployment || deployment.startsWith("-") || !Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error(usage);
  if (process.env.CONVEX_DEPLOY_KEY) throw new Error("Use CLI login and an explicit deployment, without CONVEX_DEPLOY_KEY, to avoid an ambiguous target.");
  const exec = promisify(execFile);
  const root = fileURLToPath(new URL("../", import.meta.url));
  const run = async command => {
    const result = await exec(process.execPath, [resolve(root, "node_modules/convex/bin/main.js"), ...command, "--deployment", deployment], {
      cwd: root, timeout: 180_000, maxBuffer: 2 * 1024 * 1024,
    });
    // Convex may emit successful-action diagnostics on stderr.
    if (result.stderr) process.stderr.write(result.stderr);
    return result.stdout;
  };
  console.log(`${deployment}: ${apply ? "repair (probe, enable, backfill, verify)" : "read-only inspection"}`);
  let previous;
  const status = await repairThumbnails({ run, apply, timeoutMs, log: status => {
    const summary = JSON.stringify({ enabled: status.enabled, shaders: status.effects.length,
      latestReady: status.effects.filter(e => e.latest.ready).length,
      published: status.effects.filter(e => e.published).length,
      publishedReady: status.effects.filter(e => e.published?.ready).length });
    if (summary !== previous) console.log(summary);
    previous = summary;
  } });
  if (!status.complete) {
    console.log(JSON.stringify(status.effects.filter(e => !e.latest.ready || (e.published && !e.published.ready)), null, 2));
    console.error("Generation is disabled or images are missing. Use --apply on the intended deployment to repair.");
    return 1;
  }
  console.log("Verified: generation enabled; latest and exact public-release thumbnails exist in storage.");
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; }).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
