import { z } from "zod";

export const mirrorSchema = z
  .object({
    id: z.string().min(1, "Mirror id is required"),
    x1: z.number(),
    y1: z.number(),
    x2: z.number(),
    y2: z.number(),
    locked: z.boolean().optional().default(false),
    hidden: z.boolean().optional().default(false),
  })
  .strict();

export type Mirror = z.infer<typeof mirrorSchema>;

interface MirrorUpdatableFields {
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  locked?: boolean;
  hidden?: boolean;
}

export type MirrorUpdate = MirrorUpdatableFields;

export const DEFAULT_MIRROR_LENGTH = 200;
