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

export const lightSchema = z.discriminatedUnion("type", [radialLightSchema, conicLightSchema]);

export type Light = z.infer<typeof lightSchema>;
export type RadialLight = z.infer<typeof radialLightSchema>;
export type ConicLight = z.infer<typeof conicLightSchema>;
export type LightType = Light["type"];
export type LightUpdate = Partial<Omit<Light, "id">>;

export type LightPreset = {
  id: string;
  name: string;
  lights: Light[];
};

export const DEFAULT_LIGHT_COLOR = "#ffffff";
export const DEFAULT_LIGHT_RADIUS = 300;
export const DEFAULT_LIGHT_INTENSITY = 1;
export const DEFAULT_CONE_ANGLE = 60;
