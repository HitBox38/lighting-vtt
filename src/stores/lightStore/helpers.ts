import {
  DEFAULT_CONE_ANGLE,
  DEFAULT_LIGHT_COLOR,
  DEFAULT_LIGHT_INTENSITY,
  DEFAULT_LIGHT_RADIUS,
  DEFAULT_MIRROR_LENGTH,
  type Light,
  type LightType,
  type Mirror,
  type TokenInstance,
  type TokenTemplate,
  lightSchema,
  mirrorSchema,
} from "@shared/index";

import { createId } from "@/lib/createId";

export const getIsGM = (): boolean => {
  if (typeof window === "undefined") return true;
  const params = new URLSearchParams(window.location.search);
  return params.get("isGM") !== "false";
};

export const buildLight = (type: LightType, x: number, y: number): Light => {
  const base = {
    id: createId(),
    type,
    x,
    y,
    radius: DEFAULT_LIGHT_RADIUS,
    color: DEFAULT_LIGHT_COLOR,
    intensity: DEFAULT_LIGHT_INTENSITY,
  };

  switch (type) {
    case "radial":
      return lightSchema.parse(base);
    case "line":
      return lightSchema.parse({
        ...base,
        radius: 10,
        targetX: x + DEFAULT_LIGHT_RADIUS,
        targetY: y,
      });
    case "conic":
      return lightSchema.parse({
        ...base,
        coneAngle: DEFAULT_CONE_ANGLE,
        targetX: x + DEFAULT_LIGHT_RADIUS,
        targetY: y,
      });
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
};

export const buildMirror = (x: number, y: number): Mirror => {
  const halfLength = DEFAULT_MIRROR_LENGTH / 2;
  return mirrorSchema.parse({
    id: createId(),
    x1: x - halfLength,
    y1: y,
    x2: x + halfLength,
    y2: y,
  });
};

export const computeStateHash = (
  lights: Light[],
  mirrors: Mirror[],
  tokenTemplates: TokenTemplate[],
  tokens: TokenInstance[],
): string => {
  return JSON.stringify({ lights, mirrors, tokenTemplates, tokens });
};
