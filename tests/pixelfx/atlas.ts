import { z } from "zod";

const dimension = z.number().int().positive();
const coordinate = z.number().int().nonnegative();
const size = z.object({ w: dimension, h: dimension });
const atlasSchema = z.object({
  frames: z.array(z.object({
    frame: size.extend({ x: coordinate, y: coordinate }),
    duration: dimension,
    rotated: z.literal(false),
    trimmed: z.literal(false),
    sourceSize: size,
    spriteSourceSize: size.extend({ x: z.literal(0), y: z.literal(0) }),
  })).min(1),
  meta: z.object({
    size,
    pixelfx: z.object({
      pivot: z.tuple([coordinate, coordinate]),
      loop: z.boolean(),
    }),
  }),
});

/** Deliberately imports only full-frame, unrotated PixelFX sheets used by this pilot. */
export function parseAtlas(raw: unknown) {
  const atlas = atlasSchema.parse(raw);
  const first = atlas.frames[0].frame;
  for (const { frame, sourceSize, spriteSourceSize } of atlas.frames) {
    if (frame.x + frame.w > atlas.meta.size.w || frame.y + frame.h > atlas.meta.size.h) {
      throw new Error("Frame extends beyond the atlas");
    }
    if (frame.w !== first.w || frame.h !== first.h ||
      sourceSize.w !== frame.w || sourceSize.h !== frame.h ||
      spriteSourceSize.w !== frame.w || spriteSourceSize.h !== frame.h) {
      throw new Error("Pilot sheets must use consistent, full-sized frames");
    }
  }
  const pivot = atlas.meta.pixelfx.pivot;
  if (pivot[0] > first.w || pivot[1] > first.h) throw new Error("Pivot lies outside the frame");
  let durationMs = 0;
  const ends = atlas.frames.map(({ duration }) => (durationMs += duration));
  return { ...atlas, ends, durationMs, frameWidth: first.w, frameHeight: first.h, pivot };
}

export type Atlas = ReturnType<typeof parseAtlas>;

/** Per-frame durations, including unequal durations, are the playback authority. */
export function frameAtTime(atlas: Atlas, elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs)) throw new Error("Playback time must be finite");
  const elapsed = Math.max(0, elapsedMs);
  if (!atlas.meta.pixelfx.loop && elapsed >= atlas.durationMs) return atlas.frames.length - 1;
  const time = atlas.meta.pixelfx.loop ? elapsed % atlas.durationMs : elapsed;
  let lo = 0, hi = atlas.ends.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (time < atlas.ends[mid]) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

export function frameStart(atlas: Atlas, index: number): number {
  return index === 0 ? 0 : atlas.ends[index - 1];
}

/** Center the frame's bounds while placing its local origin at the exported pivot. */
export function plateLayout(atlas: Atlas, scale: number) {
  const width = Math.max(440, atlas.frameWidth * scale + 64);
  const height = Math.max(280, atlas.frameHeight * scale + 64);
  return {
    width, height,
    x: Math.round((width - atlas.frameWidth * scale) / 2 + atlas.pivot[0] * scale),
    y: Math.round((height - atlas.frameHeight * scale) / 2 + atlas.pivot[1] * scale),
  };
}
