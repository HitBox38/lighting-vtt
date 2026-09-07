import { TokenHandleSet } from "@/components/organisms/TokenControls/components/TokenHandleSet";
import { useTokenDrag } from "@/components/organisms/TokenControls/hooks/useTokenDrag";
import type { TokenControlsProps } from "@/components/organisms/TokenControls/types";
import { useTokenStore } from "@/stores/tokenStore/tokenStore";

export function TokenControls({
  isGM,
  sizeEditTokenId,
  onCloseSizeEdit,
  onOpenContextMenu,
  onCloseContextMenu,
  remotePlayerId,
  allowedTokenIds,
  onRemoteTokenMove,
}: TokenControlsProps) {
  const isRemotePlayer = !!remotePlayerId;
  const tokens = useTokenStore((state) => state.tokens);
  const setHoveredTokenId = useTokenStore((state) => state.setHoveredTokenId);
  const drag = useTokenDrag({
    isGM,
    sizeEditTokenId,
    onCloseSizeEdit,
    onOpenContextMenu,
    onCloseContextMenu,
    remotePlayerId,
    allowedTokenIds,
    onRemoteTokenMove,
  });

  const canInteract = isGM || isRemotePlayer;
  if (!canInteract || tokens.length === 0) {
    return null;
  }

  const interactableTokens =
    isRemotePlayer && allowedTokenIds
      ? tokens.filter((token) => allowedTokenIds.has(token.id))
      : tokens;

  return (
    <>
      {interactableTokens.map((token) => (
        <TokenHandleSet
          key={token.id}
          token={token}
          isSizeEditing={sizeEditTokenId === token.id}
          sizeAngle={drag.getAngle(token.id)}
          onPointerDown={drag.handlePointerDown}
          onPointerMove={drag.handlePointerMove}
          onPointerUp={drag.handlePointerUp}
          onSizePointerDown={drag.handleSizePointerDown}
          onSizePointerMove={drag.handleSizePointerMove}
          onSizePointerUp={drag.handleSizePointerUp}
          onPointerOver={() => setHoveredTokenId(token.id)}
          onPointerOut={() => setHoveredTokenId(null)}
        />
      ))}
    </>
  );
}
