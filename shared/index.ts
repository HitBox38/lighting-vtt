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

// --- SCENES / PRESETS ---

export type LightPreset = {
  id: string;
  name: string;
  lights: Light[];
  mirrors: Mirror[];
};

// --- API ---

export interface SaveMapPayload {
  creatorId: string;
  name: string;
  mapUrl: string;
  lightsState: Record<string, unknown>;
  mirrorsState: Record<string, unknown>;
}

export interface Scene {
  id: string;
  creatorId: string;
  name: string;
  mapUrl: string;
  lightsState: Record<string, unknown>;
  mirrorsState: Record<string, unknown>;
  presets: LightPreset[];
  createdAt: Date | string | number;
  updatedAt: Date | string | number;
}

export interface GetMapsResponse {
  message: string;
  payload: Scene[] | null;
}

export interface GetSceneResponse {
  message: string;
  payload: Scene | null;
}

export interface SaveMapResponse {
  message: string;
  payload: { id: string } | null;
}

export interface UpdateScenePayload {
  sceneId: string;
  creatorId: string;
  lightsState: Light[];
  mirrorsState: Mirror[];
}

export interface UpdateSceneResponse {
  message: string;
  success: boolean;
}

// --- PRESET API ---

export interface SavePresetPayload {
  sceneId: string;
  creatorId: string;
  preset: LightPreset;
}

export interface SavePresetResponse {
  message: string;
  success: boolean;
  payload: { presetId: string } | null;
}

export interface DeletePresetPayload {
  sceneId: string;
  creatorId: string;
  presetId: string;
}

export interface DeletePresetResponse {
  message: string;
  success: boolean;
}
