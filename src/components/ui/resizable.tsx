import type { ComponentProps } from "react";
import { GripVertical } from "lucide-react";
import * as ResizablePrimitive from "react-resizable-panels";

import { cn } from "@/lib/utils";

function ResizablePanelGroup({
  className,
  ...props
}: ComponentProps<typeof ResizablePrimitive.Group>) {
  return (
    <ResizablePrimitive.Group
      data-slot="resizable-panel-group"
      className={cn("h-full w-full min-h-0 min-w-0", className)}
      {...props}
    />
  );
}

function ResizablePanel(
  props: ComponentProps<typeof ResizablePrimitive.Panel>,
) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />;
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: ComponentProps<typeof ResizablePrimitive.Separator> & {
  withHandle?: boolean;
}) {
  return (
    <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      title="Drag to resize · Arrow keys to adjust · Double-click to reset"
      className={cn(
        "group bg-border relative z-10 flex w-px items-center justify-center outline-none transition-colors hover:bg-primary/60 focus-visible:bg-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full",
        className,
      )}
      {...props}
    >
      {withHandle && (
        <div className="bg-background text-muted-foreground group-hover:text-primary group-focus-visible:text-primary z-10 flex h-7 w-3 items-center justify-center rounded-sm border group-aria-[orientation=horizontal]:rotate-90">
          <GripVertical className="size-3" />
        </div>
      )}
    </ResizablePrimitive.Separator>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
