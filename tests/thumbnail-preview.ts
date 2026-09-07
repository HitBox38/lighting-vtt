import { Application, Graphics, Mesh, Texture } from "pixi.js";
import { createEffectShader, effectRegistry, getEffectQuadGeometry } from "../src/lib/effects/effectRegistry";
import { THUMBNAIL_FIXTURES } from "../shared/effectThumbnailFixtures";
import { defaultParamValues, packParamValues } from "../shared/effects";

// Browser-only verification page, excluded from the application build. Exercise
// the actual Pixi shader registry used by EffectPreview at a fixed timestamp.
const references: HTMLImageElement[] = [];
for (const [index, definition] of THUMBNAIL_FIXTURES.entries()) {
  const app = new Application();
  await app.init({ width: 640, height: 360, resolution: 1, preference: "webgpu", antialias: true, autoStart: false });
  const bg = new Graphics().rect(0, 0, 640, 360).fill(0x1b1916);
  bg.setStrokeStyle({ width: 1, color: 0x51483e, alpha: 0.6 });
  for (let x = 32; x < 640; x += 32) bg.moveTo(x, 0).lineTo(x, 360);
  for (let y = 32; y < 360; y += 32) bg.moveTo(0, y).lineTo(640, y);
  bg.stroke();
  app.stage.addChild(bg);
  const key = `preview:thumbnail-comparison:${index}`;
  const compiled = await effectRegistry.get(key, app.renderer, definition);
  if (compiled.status !== "ok") throw new Error(JSON.stringify(compiled));
  const handle = createEffectShader(compiled, Texture.WHITE.source);
  const mesh = new Mesh({ geometry: getEffectQuadGeometry(), shader: handle.shader });
  mesh.position.set(320, 180);
  mesh.scale.set(360 * 0.38);
  mesh.blendMode = definition.blend;
  const u = handle.uniforms.uniforms;
  u.uParams.set(packParamValues(definition.params, defaultParamValues(definition.params)));
  u.uCenter.set([320, 180]); u.uMapSize.set([640, 360]); u.uViewport.set([640, 360]);
  u.uTime = 1; u.uRadius = 360 * 0.38; u.uRotation = 0;
  handle.uniforms.update();
  app.stage.addChild(mesh);
  app.render();
  // Compare the opaque live preview canvas. Pixi's texture extraction uses a
  // transparent canvas, which unpremultiplies additive alpha differently.
  const canvas = app.canvas;
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Browser capture failed")), "image/png"));
  const reference = new Image(); reference.src = URL.createObjectURL(blob); await reference.decode();
  references.push(reference);
  const label = document.createElement("p"); label.textContent = definition.name;
  document.body.append(label, reference);
  handle.destroy(); effectRegistry.invalidate(key); app.destroy(true, { children: true });
}
document.querySelector("#status")!.textContent = "Ready: five browser WebGPU reference images";
Object.assign(window, {
  async compareThumbnails(urls: string[]) {
    const results = [];
    for (const [index, url] of urls.entries()) {
      const image = new Image(); image.crossOrigin = "anonymous"; image.src = url; await image.decode();
      if (image.naturalWidth !== 640 || image.naturalHeight !== 360) throw new Error("Incorrect server dimensions");
      const canvas = document.createElement("canvas"); canvas.width = 640; canvas.height = 360;
      const context = canvas.getContext("2d")!; context.drawImage(image, 0, 0);
      const actual = context.getImageData(0, 0, 640, 360).data;
      context.clearRect(0, 0, 640, 360); context.drawImage(references[index], 0, 0);
      const expected = context.getImageData(0, 0, 640, 360).data;
      let total = 0, channels = 0, large = 0;
      for (let y = 2; y < 358; y++) for (let x = 2; x < 638; x++) {
        // Pixi MSAA and the static grid rasterize line edges differently.
        if (x % 32 <= 1 || x % 32 >= 30 || y % 32 <= 1 || y % 32 >= 30) continue;
        for (let c = 0; c < 4; c++) {
          const delta = Math.abs(actual[(y * 640 + x) * 4 + c] - expected[(y * 640 + x) * 4 + c]);
          total += delta; channels++; if (delta > 12) large++;
        }
      }
      results.push({ name: THUMBNAIL_FIXTURES[index].name, meanError: total / channels, fractionAbove12: large / channels, pass: total / channels < 2 && large / channels < 0.005 });
    }
    return results;
  },
});
