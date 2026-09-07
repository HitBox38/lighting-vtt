import type { Light } from "@shared/index";

export const getRadialHandlePosition = (light: Light, angle: number) => {
  if (light.type !== "radial") {
    return { x: light.x, y: light.y };
  }
  return {
    x: light.x + Math.cos(angle) * light.radius,
    y: light.y + Math.sin(angle) * light.radius,
  };
};

export const getConicAngleHandlePosition = (light: Light) => {
  if (light.type !== "conic") {
    return { x: light.x, y: light.y };
  }
  const baseAngle = Math.atan2(light.targetY - light.y, light.targetX - light.x);
  const halfCone = ((light.coneAngle ?? 60) * Math.PI) / 360;
  const angle = baseAngle + halfCone;
  return {
    x: light.x + Math.cos(angle) * light.radius,
    y: light.y + Math.sin(angle) * light.radius,
  };
};
