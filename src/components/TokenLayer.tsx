import { useCallback, useEffect, useMemo, useState } from "react";
import { Assets, Graphics as PixiGraphics, Texture as PixiTexture } from "pixi.js";

import { useLightStore } from "@/stores/lightStore";

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

export function TokenLayer({ isGM = true }: Props) {
  const templates = useLightStore((state) => state.tokenTemplates);
  const tokens = useLightStore((state) => state.tokens);
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
        const alpha = token.hidden ? 0.45 : 1;
        const borderColor = toHexNumber(template.borderColor);
        graphics.circle(token.x, token.y, TOKEN_RADIUS).fill({ texture, alpha });
        graphics.setStrokeStyle({
          width: BORDER_WIDTH,
          color: borderColor,
          alpha,
        });
        graphics.circle(token.x, token.y, TOKEN_RADIUS).stroke();
      }
    },
    [templateById, textures, visibleTokens]
  );

  if (!visibleTokens.length) {
    return null;
  }

  return <pixiGraphics draw={drawTokens} eventMode="none" />;
}

export default TokenLayer;
