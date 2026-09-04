import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { tokenInstanceSchema, tokenTemplateSchema } from "@shared/index";

import { cloneSerializable } from "@/lib/clone";
import { buildTokenInstance, buildTokenTemplate, rollD20 } from "@/stores/tokenStore/helpers";
import type { TokenStoreState } from "@/stores/tokenStore/types";

export const useTokenStore = create<TokenStoreState>()(
  devtools((set, get) => ({
    tokenTemplates: [],
    tokens: [],
    placementTemplateId: null,
    hoveredTokenId: null,
    addTokenTemplate: (template) => {
      const tokenTemplate = buildTokenTemplate(template);
      set((state) => ({ tokenTemplates: state.tokenTemplates.concat(tokenTemplate) }));
      return tokenTemplate.id;
    },
    updateTokenTemplate: (id, partial) =>
      set((state) => {
        const index = state.tokenTemplates.findIndex((template) => template.id === id);
        const current = state.tokenTemplates[index];
        if (index === -1 || !current) {
          return state;
        }
        const tokenTemplates = state.tokenTemplates.slice();
        tokenTemplates[index] = tokenTemplateSchema.parse({ ...current, ...partial });
        return { tokenTemplates };
      }),
    removeTokenTemplate: (id) =>
      set((state) => {
        const nextTokenTemplates = state.tokenTemplates.filter((template) => template.id !== id);
        if (nextTokenTemplates.length === state.tokenTemplates.length) {
          return state;
        }
        return {
          tokenTemplates: nextTokenTemplates,
          tokens: state.tokens.filter((token) => token.templateId !== id),
          placementTemplateId: state.placementTemplateId === id ? null : state.placementTemplateId,
        };
      }),
    addTokenInstance: (templateId, x, y) => {
      if (!get().tokenTemplates.some((template) => template.id === templateId)) {
        return "";
      }
      const token = buildTokenInstance(templateId, x, y);
      set((state) => ({ tokens: state.tokens.concat(token) }));
      return token.id;
    },
    updateTokenInstance: (id, partial) =>
      set((state) => {
        const index = state.tokens.findIndex((token) => token.id === id);
        const current = state.tokens[index];
        if (index === -1 || !current) {
          return state;
        }
        const tokens = state.tokens.slice();
        tokens[index] = tokenInstanceSchema.parse({ ...current, ...partial });
        return { tokens };
      }),
    removeTokenInstance: (id) =>
      set((state) => {
        const nextTokens = state.tokens.filter((token) => token.id !== id);
        if (nextTokens.length === state.tokens.length) {
          return state;
        }
        return { tokens: nextTokens };
      }),
    setPlacementTemplateId: (placementTemplateId) => set({ placementTemplateId }),
    setHoveredTokenId: (hoveredTokenId) => set({ hoveredTokenId }),
    setInitiative: (tokenId, initiative) =>
      set((state) => {
        const index = state.tokens.findIndex((token) => token.id === tokenId);
        const current = state.tokens[index];
        if (index === -1 || !current) {
          return state;
        }
        const tokens = state.tokens.slice();
        tokens[index] = tokenInstanceSchema.parse({ ...current, initiative });
        return { tokens };
      }),
    rollInitiative: (tokenId) => {
      const state = get();
      const index = state.tokens.findIndex((token) => token.id === tokenId);
      const current = state.tokens[index];
      if (index === -1 || !current) {
        return;
      }
      const tokens = state.tokens.slice();
      tokens[index] = tokenInstanceSchema.parse({ ...current, initiative: rollD20() });
      set({ tokens });
    },
    loadSceneTokens: (tokenTemplates, tokens) => {
      set({
        tokenTemplates: cloneSerializable(tokenTemplates),
        tokens: cloneSerializable(tokens),
        placementTemplateId: null,
      });
    },
    applySyncedTokens: (tokenTemplates, tokens) => {
      set({ tokenTemplates, tokens });
    },
  })),
);

export type { TokenStoreState } from "@/stores/tokenStore/types";
export type { TokenTemplateCreateInput } from "@/stores/tokenStore/types";
