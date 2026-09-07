import type { Light } from "@shared/index";

import { DirectedLightHandles } from "@/components/organisms/LightControls/components/DirectedLightHandles";
import { RadialLightHandles } from "@/components/organisms/LightControls/components/RadialLightHandles";
import type { LightHandlePointerHandlers } from "@/components/organisms/LightControls/types";

interface LightHandleSetProps extends LightHandlePointerHandlers {
  light: Light;
  radialAngle: number;
}

export function LightHandleSet({ light, radialAngle, ...handlers }: LightHandleSetProps) {
  switch (light.type) {
    case "radial":
      return <RadialLightHandles light={light} radialAngle={radialAngle} {...handlers} />;
    case "conic":
    case "line":
      return <DirectedLightHandles light={light} {...handlers} />;
    default: {
      const _exhaustive: never = light;
      return _exhaustive;
    }
  }
}
