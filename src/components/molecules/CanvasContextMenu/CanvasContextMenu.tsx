import { createPortal } from "react-dom";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface CanvasContextMenuProps {
  position: { x: number; y: number };
  onClose: () => void;
  children: React.ReactNode;
  contentClassName?: string;
}

export function CanvasContextMenu({
  position,
  onClose,
  children,
  contentClassName,
}: CanvasContextMenuProps) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <DropdownMenu
      open={true}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}>
      <DropdownMenuTrigger asChild>
        <span
          className="pointer-events-none fixed h-0 w-0"
          style={{ left: position.x, top: position.y }}
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent className={cn("w-48", contentClassName)} align="start">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>,
    document.body,
  );
}
