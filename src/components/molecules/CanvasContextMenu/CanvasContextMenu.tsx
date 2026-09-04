import { createPortal } from "react-dom";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CanvasContextMenuProps {
  position: { x: number; y: number };
  onClose: () => void;
  children: React.ReactNode;
}

export function CanvasContextMenu({ position, onClose, children }: CanvasContextMenuProps) {
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
      <DropdownMenuContent className="w-48" align="start">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>,
    document.body,
  );
}
