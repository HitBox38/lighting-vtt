import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import manifest from "./fixtures/pixelfx/manifest.json";
import { frameAtTime, frameStart, parseAtlas, plateLayout } from "./pixelfx/atlas";

function sample(loop = true) {
  return {
    frames: [20, 80, 40].map((duration, i) => ({
      frame: { x: i * 12, y: 0, w: 12, h: 8 }, duration,
      rotated: false, trimmed: false,
      sourceSize: { w: 12, h: 8 }, spriteSourceSize: { x: 0, y: 0, w: 12, h: 8 },
    })),
    meta: { size: { w: 36, h: 8 }, pixelfx: { pivot: [6, 7], loop } },
  };
}

describe("baked animation playback", () => {
  test("uses unequal frame durations and wraps at the exact loop boundary", () => {
    const atlas = parseAtlas(sample());
    expect([0, 19, 20, 99, 100, 139, 140, 160, 420].map(t => frameAtTime(atlas, t)))
      .toEqual([0, 0, 1, 1, 2, 2, 0, 1, 0]);
    expect([0, 1, 2].map(i => frameStart(atlas, i))).toEqual([0, 20, 100]);
    expect(frameAtTime(atlas, -1)).toBe(0);
    expect(() => frameAtTime(atlas, NaN)).toThrow("finite");
  });

  test("holds a nonlooping sheet at its last frame", () => {
    const atlas = parseAtlas(sample(false));
    expect(frameAtTime(atlas, 140)).toBe(2);
    expect(frameAtTime(atlas, 1000)).toBe(2);
  });

  test("preserves nonsquare dimensions and pixel pivots at every bench scale", () => {
    const atlas = parseAtlas(sample());
    for (const scale of [1, 2, 4]) {
      const { x, y, width, height } = plateLayout(atlas, scale);
      expect(x - atlas.pivot[0] * scale).toBe((width - 12 * scale) / 2);
      expect(y - atlas.pivot[1] * scale).toBe((height - 8 * scale) / 2);
    }
  });

  test("rejects geometry and timing this pilot cannot faithfully display", () => {
    const outOfBounds = sample(); outOfBounds.frames[2].frame.x = 30;
    expect(() => parseAtlas(outOfBounds)).toThrow("beyond");
    const mismatched = sample(); mismatched.frames[0].sourceSize.w = 10;
    expect(() => parseAtlas(mismatched)).toThrow("full-sized");
    const badPivot = sample(); badPivot.meta.pixelfx.pivot = [99, 7];
    expect(() => parseAtlas(badPivot)).toThrow("Pivot");
    const zeroDuration = sample(); zeroDuration.frames[0].duration = 0;
    expect(() => parseAtlas(zeroDuration)).toThrow();
    const rotated = { ...sample(), frames: [{ ...sample().frames[0], rotated: true }] };
    expect(() => parseAtlas(rotated)).toThrow();
  });
});

describe("committed PixelFX assets", () => {
  for (const item of manifest.effects) {
    test(`${item.id}: provenance, atlas geometry, transparent pixels, and playback agree`, () => {
      const root = new URL("./fixtures/pixelfx/", import.meta.url);
      const atlasBytes = readFileSync(new URL(item.atlas, root));
      const imageBytes = readFileSync(new URL(item.image, root));
      expect(createHash("sha256").update(atlasBytes).digest("hex")).toBe(item.sha256.atlas);
      expect(createHash("sha256").update(imageBytes).digest("hex")).toBe(item.sha256.image);
      const atlas = parseAtlas(JSON.parse(atlasBytes.toString("utf8")));
      const image = PNG.sync.read(imageBytes);
      expect([image.width, image.height]).toEqual([atlas.meta.size.w, atlas.meta.size.h]);
      expect(atlas.meta.pixelfx.loop).toBe(true);
      expect(frameAtTime(atlas, atlas.durationMs)).toBe(0);
      let empty = 0, visible = 0, translucent = 0;
      for (let i = 3; i < image.data.length; i += 4) {
        const alpha = image.data[i];
        if (alpha === 0) empty++;
        else { visible++; if (alpha < 255) translucent++; }
      }
      expect(empty).toBeGreaterThan(0);
      expect(visible).toBeGreaterThan(0);
      expect(translucent).toBeGreaterThan(0);
    });
  }
});
