import type { Graphics as PixiGraphics } from "pixi.js";
import type { Texture as PixiTexture } from "pixi.js";

import {
  BORDER_WIDTH,
  HIGHLIGHT_COLOR,
  HIGHLIGHT_PADDING,
  HIGHLIGHT_WIDTH,
  TOKEN_RADIUS,
} from "@/components/organisms/TokenLayer/constants";
import { toHexNumber } from "@/components/organisms/TokenLayer/helpers";
import { useTokenTextures } from "@/components/organisms/TokenLayer/hooks/useTokenTextures";
import { useTokenStore } from "@/stores/tokenStore/tokenStore";

interface Props {
  isGM?: boolean;
}

export function TokenLayer({ isGM = true }: Props) {
  const templates = useTokenStore((state) => state.tokenTemplates);
  const tokens = useTokenStore((state) => state.tokens);
  const hoveredTokenId = useTokenStore((state) => state.hoveredTokenId);
  const textures = useTokenTextures(templates);
  const visibleTokens = isGM ? tokens : tokens.filter((token) => !token.hidden);
  const templateById = new Map(templates.map((template) => [template.id, template]));

  const drawTokens = (graphics: PixiGraphics) => {
    graphics.clear();
    for (const token of visibleTokens) {
      const template = templateById.get(token.templateId);
      const texture: PixiTexture | undefined = textures[token.templateId];
      if (!template || !texture) {
        continue;
      }
      const radius = token.size ?? TOKEN_RADIUS;
      const alpha = token.hidden ? 0.45 : 1;
      if (token.id === hoveredTokenId) {
        graphics.setStrokeStyle({ width: HIGHLIGHT_WIDTH, color: HIGHLIGHT_COLOR, alpha: 1 });
        graphics.circle(token.x, token.y, radius + HIGHLIGHT_PADDING).stroke();
      }
      graphics.circle(token.x, token.y, radius).fill({ texture, alpha });
      graphics.setStrokeStyle({ width: BORDER_WIDTH, color: toHexNumber(template.borderColor), alpha });
      graphics.circle(token.x, token.y, radius).stroke();
    }
  };

  if (!visibleTokens.length) {
    return null;
  }

  return <pixiGraphics draw={drawTokens} eventMode="none" />;
}
