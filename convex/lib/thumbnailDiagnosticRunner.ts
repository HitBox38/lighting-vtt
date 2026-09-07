/** Fixed subprocess source, bundled as text so Convex need not ship a sidecar file. */
export const THUMBNAIL_DIAGNOSTIC_RUNNER = String.raw`
import { pathToFileURL } from "node:url";
import { createWriteStream, mkdirSync, renameSync, rmSync, chmodSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
let body = "";
for await (const chunk of process.stdin) body += chunk;
const input = JSON.parse(body);
const started = performance.now();
try {
  if (input.mode === "provision") {
    // Use the pinned adapter's own integrity/cache implementation. Its stock
    // installer invokes /usr/bin/tar, which is absent in the Convex Node runtime.
    const cacheUrl = pathToFileURL(join(dirname(input.installer), "software-renderer-cache.js")).href;
    const cache = await import(cacheUrl);
    const cached = cache.getCachedSoftwareRenderer();
    if (!cached) {
      if (process.platform !== "linux" || !["arm64", "x64"].includes(process.arch)) {
        throw new Error("Software rendering requires Linux arm64 or x64");
      }
      const destination = cache.softwareRendererCacheDirectory();
      const temporary = destination + "." + randomUUID() + ".tmp";
      mkdirSync(temporary, { recursive: true, mode: 0o700 });
      const asset = "mesa-lavapipe-25.0.7-linux-" + process.arch + ".tar.gz";
      const archive = join(temporary, asset);
      try {
        const url = "https://github.com/vercel-labs/vgpu/releases/download/" + cache.softwareRendererReleaseTag + "/" + asset;
        const response = await fetch(url, { signal: AbortSignal.timeout(45_000) });
        if (!response.ok || !response.body) throw new Error("Software renderer download HTTP " + response.status);
        let bytes = 0;
        const limiter = new Transform({ transform(chunk, _encoding, callback) {
          bytes += chunk.length;
          callback(bytes > 32 * 1024 * 1024 ? new Error("Software archive exceeds 32 MiB") : null, chunk);
        }});
        await pipeline(Readable.fromWeb(response.body), limiter, createWriteStream(archive, { flags: "wx", mode: 0o600 }));
        cache.verifySoftwareRendererArchive(archive, cache.softwareRendererExpectedHash(process.arch));
        const tar = await import(pathToFileURL(input.tar).href);
        const extract = tar.extract ?? tar.default.extract;
        const seen = new Set();
        await extract({
          file: archive, cwd: temporary, strict: true, preservePaths: false,
          filter(path, entry) {
            if (!["libvulkan_lvp.so", "lvp_icd.json"].includes(path) || entry.type !== "File" || seen.has(path)) {
              throw new Error("Unexpected software archive entry");
            }
            seen.add(path);
            return true;
          },
        });
        if (seen.size !== 2) throw new Error("Incomplete software archive");
        cache.verifySoftwareRendererFiles(temporary, process.arch);
        chmodSync(join(temporary, "lvp_icd.json"), 0o600);
        chmodSync(join(temporary, "libvulkan_lvp.so"), 0o700);
        try { renameSync(temporary, destination); }
        catch (error) { if (!cache.getCachedSoftwareRenderer()) throw error; }
      } finally {
        rmSync(temporary, { recursive: true, force: true });
      }
    }
    process.stdout.write(JSON.stringify({ downloaded: !cached, durationMs: performance.now() - started }));
  } else {
    const { init, effect, target } = await import(pathToFileURL(input.vgpu).href);
    const gpu = await init({ adapter: "software" });
    try {
      if (input.mode === "deviceLoss") {
        gpu.gpu.destroy();
        await gpu.gpu.lost;
        process.stdout.write(JSON.stringify({ deviceLost: true }));
        process.exit(0);
      }
      if (input.mode === "timeout") {
        // Hold a live native device while simulating a stalled renderer.
        while (true) { /* parent must terminate this process */ }
      }
      const color = target(gpu, { size: [640, 360], format: "rgba8unorm" });
      if (input.mode === "effect") {
        await renderSavedShader(gpu, color, input.snapshot, effect);
      } else {
        const shader = effect(gpu, "@fragment fn mainFragment() -> @location(0) vec4<f32> { return vec4<f32>(0.2, 0.4, 0.8, 1.0); }");
        await shader.compile(color);
        shader.draw(color);
      }
      const pixels = await color.read();
      const { PNG } = await import(pathToFileURL(input.pngjs).href);
      const png = new PNG({ width: 640, height: 360 });
      png.data.set(pixels);
      process.stdout.write(JSON.stringify({
        png: PNG.sync.write(png).toString("base64"),
        adapter: gpu.adapter,
        durationMs: performance.now() - started,
        maxRssKiB: process.resourceUsage().maxRSS,
      }));
    } finally {
      gpu.dispose();
    }
  }
} catch (error) {
  const chain = [];
  let cause = error;
  for (let depth = 0; cause && depth < 5; depth++, cause = cause.cause) {
    chain.push(String(cause));
  }
  process.stderr.write(chain.join("\n").slice(0, 6000));
  process.exitCode = 1;
}

async function renderSavedShader(gpu, color, snapshot, makeEffect) {
  const device = gpu.gpu;
  const spec = snapshot.spec;
  const bg = spec.background.map((x) => x / 255);
  const grid = spec.grid.map((x, i) => (x * spec.gridAlpha + spec.background[i] * (1 - spec.gridAlpha)) / 255);
  const background = makeEffect(gpu, "@fragment fn bg(@builtin(position) p: vec4<f32>) -> @location(0) vec4<f32> { let line = (u32(p.x) > 0u && u32(p.x) % " + spec.gridStep + "u == 0u) || (u32(p.y) > 0u && u32(p.y) % " + spec.gridStep + "u == 0u); return select(vec4<f32>(" + bg.join(",") + ",1.0), vec4<f32>(" + grid.join(",") + ",1.0), line); }");
  await background.compile(color);
  background.draw(color);
  device.pushErrorScope("validation");
  const module = device.createShaderModule({ code: snapshot.source });
  const compilation = await module.getCompilationInfo();
  if (compilation.messages.some((message) => message.type === "error")) {
    throw new Error("shader: WGSL compilation failed");
  }
  const uniformLayout = () => device.createBindGroupLayout({ entries: [{ binding: 0, visibility: 3, buffer: { type: "uniform" } }] });
  const layouts = [uniformLayout(), uniformLayout(), device.createBindGroupLayout({ entries: [
    { binding: 0, visibility: 3, buffer: { type: "uniform" } },
    { binding: 1, visibility: 2, texture: { sampleType: "float" } },
    { binding: 2, visibility: 2, sampler: { type: "filtering" } },
  ] })];
  const buffer = (data, usage) => {
    const resource = device.createBuffer({ size: data.byteLength, usage: usage | 8 });
    device.queue.writeBuffer(resource, 0, data);
    return resource;
  };
  const uniformBuffers = [snapshot.global, snapshot.local, snapshot.effect].map((values) => buffer(new Float32Array(values), 64));
  const white = device.createTexture({ size: [1, 1], format: "rgba8unorm", usage: 4 | 2 });
  device.queue.writeTexture({ texture: white }, new Uint8Array([255, 255, 255, 255]), { bytesPerRow: 4 }, [1, 1]);
  const groups = layouts.map((layout, index) => device.createBindGroup({ layout, entries: [
    { binding: 0, resource: { buffer: uniformBuffers[index] } },
    ...(index === 2 ? [
      { binding: 1, resource: white.createView() },
      { binding: 2, resource: device.createSampler({ magFilter: "linear", minFilter: "linear" }) },
    ] : []),
  ] }));
  let pipeline;
  try {
    pipeline = await device.createRenderPipelineAsync({
      layout: device.createPipelineLayout({ bindGroupLayouts: layouts }),
      vertex: { module, entryPoint: "mainVertex", buffers: [{ arrayStride: 16, attributes: [
        { shaderLocation: 0, offset: 0, format: "float32x2" },
        { shaderLocation: 1, offset: 8, format: "float32x2" },
      ] }] },
      fragment: { module, entryPoint: "mainFragment", targets: [{ format: "rgba8unorm", blend: {
        color: { srcFactor: "one", dstFactor: snapshot.blend === "add" ? "one" : "one-minus-src-alpha", operation: "add" },
        alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
      } }] },
      primitive: { topology: "triangle-list" },
    });
  } catch { throw new Error("shader: render pipeline compilation failed"); }
  const vertices = buffer(new Float32Array([-1,-1,0,0, 1,-1,1,0, 1,1,1,1, -1,1,0,1]), 32);
  const indices = buffer(new Uint32Array([0,1,2,0,2,3]), 16);
  const encoder = device.createCommandEncoder();
  const pass = encoder.beginRenderPass(color.renderPassDescriptor({ preserve: true }));
  pass.setPipeline(pipeline);
  groups.forEach((group, index) => pass.setBindGroup(index, group));
  pass.setVertexBuffer(0, vertices);
  pass.setIndexBuffer(indices, "uint32");
  pass.drawIndexed(6);
  pass.end();
  device.queue.submit([encoder.finish()]);
  await device.queue.onSubmittedWorkDone();
  const error = await device.popErrorScope();
  if (error) throw new Error("shader: GPU validation failed");
}
`;
