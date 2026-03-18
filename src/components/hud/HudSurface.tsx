import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const HUD_SURFACE_CLASSNAME =
  "inline-flex gap-2 rounded-xl border border-border/70 bg-background/85 px-2 py-2 shadow-lg backdrop-blur-md supports-[backdrop-filter]:bg-background/75";

type HudSurfaceProps = HTMLAttributes<HTMLDivElement>;

export function HudSurface({ className, ...props }: HudSurfaceProps) {
  return <div className={cn(HUD_SURFACE_CLASSNAME, className)} {...props} />;
}
