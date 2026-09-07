import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { setTimeout } from "node:timers/promises";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Development CLI identity, not an authentication bypass in the application.
// Pass an existing disposable effect ID, owned by this identity, to continue a run.
const identity = JSON.stringify({ subject: "thumbnail-verification-20260907", name: "Thumbnail verification" });
if (process.env.CONVEX_DEPLOY_KEY || !/^CONVEX_DEPLOYMENT=["']?dev:/m.test(readFileSync(".env.local", "utf8"))) throw new Error("Run this disposable verification only with a configured development deployment");
const exec = promisify(execFile);
async function run(name, args) {
  const result = await exec(process.execPath, ["node_modules/convex/bin/main.js", "run", name, JSON.stringify(args), "--identity", identity], { windowsHide: true, timeout: 30_000 });
  return result.stdout.trim() ? JSON.parse(result.stdout) : null;
}
const definition = { name: "Thumbnail verification temporary", description: "Disposable asynchronous generation verification", kind: "shader", wgsl: "fn effectMain(fx: EffectInput) -> vec4<f32> { return vec4<f32>(0.2,0.6,0.9,0.5); }", glsl: "vec4 effectMain(EffectInput fx) { return vec4(0.2,0.6,0.9,0.5); }", params: [], coverage: { kind: "none" }, blend: "normal" };
const effectId = process.argv[2] ?? (await run("effects:createEffect", { definition })).effectId;
async function waitFor(predicate) {
  const deadline = Date.now() + 150_000;
  while (Date.now() < deadline) {
    const effect = await run("effects:getEffect", { effectId });
    if (predicate(effect)) return effect;
    await setTimeout(1500);
  }
  throw new Error("Thumbnail did not reach its expected state within 150 seconds");
}
try {
  const initial = await waitFor((effect) => effect?.thumbnailStatus === "ready");
  const invalid = await run("effects:saveVersion", { effectId, definition: { ...definition, wgsl: "fn effectMain(fx: EffectInput) -> vec4<f32> { invalid WGSL }" } });
  const pending = await run("effects:getEffect", { effectId });
  assert.equal(pending.latestVersion, invalid.version);
  assert.equal(pending.generatedThumbnailUrl, initial.generatedThumbnailUrl);
  console.log("Invalid shader saved successfully; last image retained.");
  const failed = await waitFor((effect) => effect?.thumbnailStatus === "failed");
  assert.equal(failed.generatedThumbnailUrl, initial.generatedThumbnailUrl);
  const versions = await Promise.all([run("effects:saveVersion", { effectId, definition }), run("effects:saveVersion", { effectId, definition })]);
  const latest = Math.max(...versions.map((version) => version.version));
  const saved = await run("effects:getEffect", { effectId });
  console.log(`Two rapid saves accepted; waiting for latest version ${latest}.`);
  const ready = await waitFor((effect) => effect?.thumbnailStatus === "ready" && effect.thumbnailVersion === latest);
  assert.equal(ready.updatedAt, saved.updatedAt);
  assert.notEqual(ready.generatedThumbnailUrl, initial.generatedThumbnailUrl);
  console.log("PASS: failure recovery, latest-version publication, last-image retention, unchanged library ordering.");
} finally {
  await run("effects:deleteEffect", { effectId });
  console.log("Deleted disposable effect and its generated thumbnail.");
}
