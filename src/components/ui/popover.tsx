import { Popover as Primitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
export const Popover = Primitive.Root;
export const PopoverTrigger = Primitive.Trigger;
export function PopoverContent({ className, align = "center", sideOffset = 8, ...props }: ComponentProps<typeof Primitive.Content>) {
  return <Primitive.Portal><Primitive.Content align={align} sideOffset={sideOffset} className={cn("bg-popover text-popover-foreground z-50 max-w-[calc(100vw-1rem)] rounded-xl border p-4 shadow-xl outline-none", className)} {...props} /></Primitive.Portal>;
}
