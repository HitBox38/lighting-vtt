import {
  type TokenInstance,
  tokenInstanceSchema,
  type TokenTemplate,
  tokenTemplateSchema,
} from "@shared/index";

import { createId } from "@/lib/createId";
import type { TokenTemplateCreateInput } from "@/stores/tokenStore/types";

export const buildTokenTemplate = (template: TokenTemplateCreateInput): TokenTemplate => {
  return tokenTemplateSchema.parse({
    id: createId(),
    ...template,
  });
};

export const buildTokenInstance = (templateId: string, x: number, y: number): TokenInstance => {
  return tokenInstanceSchema.parse({
    id: createId(),
    templateId,
    x,
    y,
  });
};

export const getTokenStateHash = (
  tokenTemplates: TokenTemplate[],
  tokens: TokenInstance[],
): string => {
  return JSON.stringify({ tokenTemplates, tokens });
};

export const rollD20 = (): number => Math.floor(Math.random() * 20) + 1;
