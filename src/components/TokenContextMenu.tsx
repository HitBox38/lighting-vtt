import { useEffect } from "react";
import { createPortal } from "react-dom";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTokenStore } from "@/stores/tokenStore";

export interface TokenContextMenuState {
  tokenId: string;
  position: { x: number; y: number };
}

interface Props {
  state: TokenContextMenuState;
  isGM: boolean;
  onEditSize: (tokenId: string) => void;
  onClose: () => void;
}

export function TokenContextMenu({ state, isGM, onEditSize, onClose }: Props) {
  const token = useTokenStore((store) => store.tokens.find((candidate) => candidate.id === state.tokenId));
  const updateTokenInstance = useTokenStore((store) => store.updateTokenInstance);
  const removeTokenInstance = useTokenStore((store) => store.removeTokenInstance);

  useEffect(() => {
    if (!token) {
      onClose();
    }
  }, [token, onClose]);

  if (typeof document === "undefined" || !token) {
    return null;
  }

  const handleVisibilityToggle = (hidden: boolean) => {
    updateTokenInstance(token.id, { hidden });
    onClose();
  };

  const handleDelete = () => {
    removeTokenInstance(token.id);
    onClose();
  };

  const menu = (
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
          style={{ left: state.position.x, top: state.position.y }}
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48" align="start">
        {isGM && (
          <>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                handleVisibilityToggle(!token.hidden);
              }}>
              {token.hidden ? "Show" : "Hide"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                onEditSize(token.id);
                onClose();
              }}>
              Edit Size
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={(event) => {
            event.preventDefault();
            handleDelete();
          }}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return createPortal(menu, document.body);
}

export default TokenContextMenu;
