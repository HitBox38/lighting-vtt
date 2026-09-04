import { useEffect } from "react";

import { CanvasContextMenu } from "@/components/molecules/CanvasContextMenu";
import type { TokenContextMenuState } from "@/components/molecules/TokenContextMenu/types";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useTokenStore } from "@/stores/tokenStore/tokenStore";

interface Props {
  state: TokenContextMenuState;
  isGM: boolean;
  onEditSize: (tokenId: string) => void;
  onClose: () => void;
}

export function TokenContextMenu({ state, isGM, onEditSize, onClose }: Props) {
  const token = useTokenStore((store) =>
    store.tokens.find((candidate) => candidate.id === state.tokenId),
  );
  const updateTokenInstance = useTokenStore((store) => store.updateTokenInstance);
  const removeTokenInstance = useTokenStore((store) => store.removeTokenInstance);

  useEffect(() => {
    if (!token) {
      onClose();
    }
  }, [token, onClose]);

  if (!token) {
    return null;
  }

  return (
    <CanvasContextMenu position={state.position} onClose={onClose}>
      {isGM ? (
        <>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              updateTokenInstance(token.id, { hidden: !token.hidden });
              onClose();
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
      ) : null}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        variant="destructive"
        onSelect={(event) => {
          event.preventDefault();
          removeTokenInstance(token.id);
          onClose();
        }}>
        Delete
      </DropdownMenuItem>
    </CanvasContextMenu>
  );
}
