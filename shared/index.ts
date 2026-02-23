import { z } from "zod";

// --- LIGHTS ---
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
interface LightUpdatableFields {
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
}

export type LightUpdate = LightUpdatableFields;

export const DEFAULT_LIGHT_COLOR = "#ffffff";
export const DEFAULT_LIGHT_RADIUS = 300;
export const DEFAULT_LIGHT_INTENSITY = 1;
export const DEFAULT_CONE_ANGLE = 60;

// --- MIRRORS ---

export const mirrorSchema = z
  .object({
    id: z.string().min(1, "Mirror id is required"),
    x1: z.number(),
    y1: z.number(),
    x2: z.number(),
    y2: z.number(),
    locked: z.boolean().optional().default(false),
    fixedWidth: z.boolean().optional().default(false),
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
  fixedWidth?: boolean;
  hidden?: boolean;
}

export type MirrorUpdate = MirrorUpdatableFields;

export const DEFAULT_MIRROR_LENGTH = 200;

// --- TOKENS ---

export const tokenTemplateSchema = z
  .object({
    id: z.string().min(1, "Token template id is required"),
    name: z.string().min(1, "Token template name is required"),
    imageUrl: z.string().url("Token image must be a valid URL"),
    imageKey: z.string().min(1, "Token image key is required"),
    borderColor: z.string().regex(HEX_COLOR, "Border color must be a hex string like #RRGGBB"),
  })
  .strict();

export type TokenTemplate = z.infer<typeof tokenTemplateSchema>;

interface TokenTemplateUpdatableFields {
  name?: string;
  imageUrl?: string;
  imageKey?: string;
  borderColor?: string;
}

export type TokenTemplateUpdate = TokenTemplateUpdatableFields;

export const tokenInstanceSchema = z
  .object({
    id: z.string().min(1, "Token instance id is required"),
    templateId: z.string().min(1, "Token template id is required"),
    x: z.number(),
    y: z.number(),
    hidden: z.boolean().optional().default(false),
  })
  .strict();

export type TokenInstance = z.infer<typeof tokenInstanceSchema>;

interface TokenInstanceUpdatableFields {
  templateId?: string;
  x?: number;
  y?: number;
  hidden?: boolean;
}

export type TokenInstanceUpdate = TokenInstanceUpdatableFields;

// --- SCENES / PRESETS ---

export type LightPreset = {
  id: string;
  name: string;
  lights: Light[];
  mirrors: Mirror[];
};
