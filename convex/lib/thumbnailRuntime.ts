"use node";

import { createRequire } from "node:module";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { init } from "vgpu/node";
import { extract } from "tar";
import { PNG } from "pngjs";
import { z } from "zod";
import { VULKAN_LIBRARIES } from "./vulkanLoader.generated";
import { runThumbnailProcess } from "./thumbnailProcess";
import { THUMBNAIL_DIAGNOSTIC_RUNNER } from "./thumbnailDiagnosticRunner";
import { thumbnailShaderInput, THUMBNAIL_SPEC, type EffectSnapshotSpec } from "../../shared/effectThumbnail";
import type { EffectDefinition } from "../../shared/effects";

const outputSchema = z.object({
  png: z.string(), adapter: z.object({ name: z.string(), type: z.enum(["cpu", "gpu"]) }),
  durationMs: z.number(), maxRssKiB: z.number(),
});

export async function withThumbnailRuntime<T>(
  operation: (run: (mode: string, extra?: object, timeoutMs?: number) => Promise<string>) => Promise<T>,
  options: { freshCache?: boolean } = {},
): Promise<T> {
  if (typeof init !== "function" || typeof extract !== "function") throw new Error("Rendering dependencies are unavailable");
  if (process.platform !== "linux" || process.arch !== "arm64") throw new Error("Thumbnail runtime requires Linux ARM64");
  const require = createRequire(import.meta.url);
  const vgpuRequire = createRequire(require.resolve("vgpu/package.json"));
  const installer = vgpuRequire.resolve.paths("@vgpu/adapter-node")
    ?.map((root) => join(root, "@vgpu/adapter-node/dist/software-renderer-installer.js")).find(existsSync);
  if (!installer) throw new Error("vgpu installer is unavailable");
  const paths = { vgpu: require.resolve("vgpu/node"), pngjs: require.resolve("pngjs"), tar: require.resolve("tar"), installer };
  const directory = mkdtempSync(join(tmpdir(), "lighting-vtt-vulkan-"));
  try {
    for (const asset of VULKAN_LIBRARIES) {
      const bytes = gunzipSync(Buffer.from(asset.gzip, "base64"));
      if (createHash("sha256").update(bytes).digest("hex") !== asset.sha256) throw new Error("Native library integrity failure");
      writeFileSync(join(directory, asset.filename), bytes, { mode: 0o700, flag: "wx" });
    }
    const env: NodeJS.ProcessEnv = {
      PATH: process.env.PATH, HOME: tmpdir(), TMP: tmpdir(), TEMP: tmpdir(),
      VGPU_CACHE_DIR: options.freshCache ? join(directory, "cache") : join(tmpdir(), "lighting-vtt-vgpu-0.4.0"), VGPU_ADAPTER: "software",
      LD_LIBRARY_PATH: [directory, process.env.LD_LIBRARY_PATH].filter(Boolean).join(":"),
    };
    const run = (mode: string, extra: object = {}, timeoutMs?: number) =>
      runThumbnailProcess(THUMBNAIL_DIAGNOSTIC_RUNNER, { ...paths, ...extra, mode }, { env, timeoutMs });
    await run("provision");
    return await operation(run);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

export function decodeThumbnailOutput(raw: string) {
  const result = outputSchema.parse(JSON.parse(raw));
  const bytes = Buffer.from(result.png, "base64");
  const decoded = PNG.sync.read(bytes);
  if (decoded.width !== 640 || decoded.height !== 360) throw new Error("Unexpected thumbnail dimensions");
  return { ...result, bytes, decoded };
}

export async function renderEffectThumbnailWithMetrics(definition: EffectDefinition, spec: EffectSnapshotSpec = THUMBNAIL_SPEC) {
  const snapshot = thumbnailShaderInput(definition, spec);
  return withThumbnailRuntime(async (run) => decodeThumbnailOutput(await run("effect", { snapshot })));
}

/** Public renderer contract within the backend: saved definition + versioned spec → PNG bytes. */
export async function renderEffectThumbnail(definition: EffectDefinition, spec: EffectSnapshotSpec = THUMBNAIL_SPEC): Promise<Buffer> {
  return (await renderEffectThumbnailWithMetrics(definition, spec)).bytes;
}
