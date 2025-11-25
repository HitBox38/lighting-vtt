import { z } from "zod";

const HEX_COLOR = /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const sharedFields = {
  id: z.string().min(1, "Light id is required"),
  x: z.number(),
  y: z.number(),
  radius: z.number().positive(),
  color: z.string().regex(HEX_COLOR, "Color must be a hex string like #RRGGBB"),
  intensity: z.number().min(0).max(1),
  locked: z.boolean().optional().default(false),
  hidden: z.boolean().optional().default(false),
};

export const radialLightSchema = z
  .object({
    ...sharedFields,
    type: z.literal("radial"),
  })
  .strict();

export const conicLightSchema = z
  .object({
    ...sharedFields,
    type: z.literal("conic"),
    coneAngle: z.number().min(1).max(360),
    targetX: z.number(),
    targetY: z.number(),
  })
  .strict();

export const lineLightSchema = z
  .object({
    ...sharedFields,
    type: z.literal("line"),
    targetX: z.number(),
    targetY: z.number(),
  })
  .strict();

export const lightSchema = z.discriminatedUnion("type", [
  radialLightSchema,
  conicLightSchema,
  lineLightSchema,
]);

export type Light = z.infer<typeof lightSchema>;
export type RadialLight = z.infer<typeof radialLightSchema>;
export type ConicLight = z.infer<typeof conicLightSchema>;
export type LineLight = z.infer<typeof lineLightSchema>;
export type LightType = Light["type"];
type LightUpdatableFields = {
  type?: LightType;
  x?: number;
  y?: number;
  radius?: number;
  color?: string;
  intensity?: number;
  locked?: boolean;
  hidden?: boolean;
  coneAngle?: number;
  targetX?: number;
  targetY?: number;
};

export type LightUpdate = LightUpdatableFields;

export type LightPreset = {
  id: string;
  name: string;
  lights: Light[];
};

export const DEFAULT_LIGHT_COLOR = "#ffffff";
export const DEFAULT_LIGHT_RADIUS = 300;
export const DEFAULT_LIGHT_INTENSITY = 1;
export const DEFAULT_CONE_ANGLE = 60;
