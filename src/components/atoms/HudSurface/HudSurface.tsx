import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { HUD_SURFACE_CLASSNAME } from "@/components/atoms/HudSurface/constants";

type HudSurfaceProps = HTMLAttributes<HTMLDivElement>;

export function HudSurface({ className, ...props }: HudSurfaceProps) {
  return <div className={cn(HUD_SURFACE_CLASSNAME, className)} {...props} />;
}
