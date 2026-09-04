import { useCallback, useEffect, useMemo, useState } from "react";
import { Assets, Graphics as PixiGraphics, Texture as PixiTexture } from "pixi.js";

import { useTokenStore } from "@/stores/tokenStore";

interface Props {
  isGM?: boolean;
}

const TOKEN_RADIUS = 22;
const BORDER_WIDTH = 3;

const toHexNumber = (color: string): number => {
  const normalized = color.startsWith("#") ? color.slice(1) : color;
  const parsed = Number.parseInt(normalized.slice(0, 6), 16);
  return Number.isNaN(parsed) ? 0xffffff : parsed;
};

const HIGHLIGHT_COLOR = 0x3b82f6;
const HIGHLIGHT_WIDTH = 4;
const HIGHLIGHT_PADDING = 4;

// HP bar constants
const HP_BAR_WIDTH_RATIO = 1.6; // relative to token radius
const HP_BAR_HEIGHT = 4;
const HP_BAR_OFFSET = 6; // gap below the token circle
const HP_BAR_BG_COLOR = 0x333333;
const HP_BAR_BG_ALPHA = 0.7;
const HP_BAR_GREEN = 0x22c55e;
const HP_BAR_YELLOW = 0xeab308;
const HP_BAR_RED = 0xef4444;
const HP_BAR_BORDER_RADIUS = 2;
const TEMP_HP_COLOR = 0x3b82f6;

export function TokenLayer({ isGM = true }: Props) {
  const templates = useTokenStore((state) => state.tokenTemplates);
  const tokens = useTokenStore((state) => state.tokens);
  const hoveredTokenId = useTokenStore((state) => state.hoveredTokenId);
  const [textures, setTextures] = useState<Record<string, PixiTexture>>({});

  const visibleTokens = useMemo(
    () => (isGM ? tokens : tokens.filter((token) => !token.hidden)),
    [isGM, tokens]
  );

  const templateById = useMemo(() => {
    const map = new Map<string, (typeof templates)[number]>();
    for (const template of templates) {
      map.set(template.id, template);
    }
    return map;
  }, [templates]);

  useEffect(() => {
    let cancelled = false;
    const missingTemplateIds = templates
      .filter((template) => !textures[template.id])
      .map((template) => template.id);
    if (!missingTemplateIds.length) {
      return;
    }
    void (async () => {
      const loaded: Record<string, PixiTexture> = {};
      for (const templateId of missingTemplateIds) {
        const template = templateById.get(templateId);
        if (!template) {
          continue;
        }
        try {
          loaded[templateId] = await Assets.load({
            src: template.imageUrl,
            parser: "loadTextures",
          });
        } catch (error) {
          console.error("Failed to load token texture:", error);
        }
      }
      if (cancelled || Object.keys(loaded).length === 0) {
        return;
      }
      setTextures((prev) => ({ ...prev, ...loaded }));
    })();
    return () => {
      cancelled = true;
    };
  }, [templateById, templates, textures]);

  const drawTokens = useCallback(
    (graphics: PixiGraphics) => {
      graphics.clear();
      if (!visibleTokens.length) {
        return;
      }

      for (const token of visibleTokens) {
        const template = templateById.get(token.templateId);
        if (!template) {
          continue;
        }
        const texture = textures[token.templateId];
        if (!texture) {
          continue;
        }
        const radius = token.size ?? TOKEN_RADIUS;
        const alpha = token.hidden ? 0.45 : 1;
        const borderColor = toHexNumber(template.borderColor);
        const isHovered = token.id === hoveredTokenId;

        if (isHovered) {
          graphics.setStrokeStyle({
            width: HIGHLIGHT_WIDTH,
            color: HIGHLIGHT_COLOR,
            alpha: 1,
          });
          graphics.circle(token.x, token.y, radius + HIGHLIGHT_PADDING).stroke();
        }

        graphics.circle(token.x, token.y, radius).fill({ texture, alpha });
        graphics.setStrokeStyle({
          width: BORDER_WIDTH,
          color: borderColor,
          alpha,
        });
        graphics.circle(token.x, token.y, radius).stroke();

        // Draw HP bar for GM (or tokens with HP data visible to all)
        if (isGM && token.maxHp !== undefined && token.maxHp > 0) {
          const currentHp = token.currentHp ?? 0;
          const tempHp = token.tempHp ?? 0;
          const maxHp = token.maxHp;
          const hpRatio = Math.max(0, Math.min(1, currentHp / maxHp));
          const tempRatio = Math.min(1 - hpRatio, tempHp / maxHp);

          const barWidth = radius * HP_BAR_WIDTH_RATIO;
          const barX = token.x - barWidth / 2;
          const barY = token.y + radius + HP_BAR_OFFSET;

          // Background
          graphics
            .roundRect(barX, barY, barWidth, HP_BAR_HEIGHT, HP_BAR_BORDER_RADIUS)
            .fill({ color: HP_BAR_BG_COLOR, alpha: HP_BAR_BG_ALPHA });

          // HP fill
          if (hpRatio > 0) {
            const hpColor =
              hpRatio > 0.5 ? HP_BAR_GREEN : hpRatio > 0.25 ? HP_BAR_YELLOW : HP_BAR_RED;
            const fillWidth = barWidth * hpRatio;
            graphics
              .roundRect(barX, barY, fillWidth, HP_BAR_HEIGHT, HP_BAR_BORDER_RADIUS)
              .fill({ color: hpColor, alpha });
          }

          // Temp HP fill (stacked after current HP)
          if (tempRatio > 0) {
            const tempX = barX + barWidth * hpRatio;
            const tempWidth = barWidth * tempRatio;
            graphics
              .roundRect(tempX, barY, tempWidth, HP_BAR_HEIGHT, HP_BAR_BORDER_RADIUS)
              .fill({ color: TEMP_HP_COLOR, alpha: alpha * 0.8 });
          }
        }
      }
    },
    [hoveredTokenId, templateById, textures, visibleTokens, isGM]
  );

  if (!visibleTokens.length) {
    return null;
  }

  return <pixiGraphics draw={drawTokens} eventMode="none" />;
}

export default TokenLayer;
