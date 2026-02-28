import { create } from "zustand";
import { devtools } from "zustand/middleware";

import {
  type TokenInstance,
  type TokenInstanceUpdate,
  tokenInstanceSchema,
  type TokenTemplate,
  type TokenTemplateUpdate,
  tokenTemplateSchema,
} from "@shared/index";

/** Input for creating a template; borderColor is optional and defaults to #ffffff. */
export type TokenTemplateCreateInput = Omit<TokenTemplate, "id" | "borderColor"> & {
  borderColor?: string;
};

interface TokenStoreState {
  tokenTemplates: TokenTemplate[];
  tokens: TokenInstance[];
  placementTemplateId: string | null;
  hoveredTokenId: string | null;
  addTokenTemplate: (template: TokenTemplateCreateInput) => string;
  updateTokenTemplate: (id: string, partial: TokenTemplateUpdate) => void;
  removeTokenTemplate: (id: string) => void;
  addTokenInstance: (templateId: string, x: number, y: number) => string;
  updateTokenInstance: (id: string, partial: TokenInstanceUpdate) => void;
  removeTokenInstance: (id: string) => void;
  setPlacementTemplateId: (id: string | null) => void;
  setHoveredTokenId: (id: string | null) => void;
  setInitiative: (tokenId: string, initiative: number | undefined) => void;
  rollInitiative: (tokenId: string) => void;
  loadSceneTokens: (tokenTemplates: TokenTemplate[], tokens: TokenInstance[]) => void;
  applySyncedTokens: (tokenTemplates: TokenTemplate[], tokens: TokenInstance[]) => void;
}

const createId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2, 10)}`;
};

const buildTokenTemplate = (
  template: TokenTemplateCreateInput
): TokenTemplate => {
  const candidate = {
    id: createId(),
    ...template,
  };
  return tokenTemplateSchema.parse(candidate);
};

const buildTokenInstance = (templateId: string, x: number, y: number): TokenInstance => {
  const candidate = {
    id: createId(),
    templateId,
    x,
    y,
  };
  return tokenInstanceSchema.parse(candidate);
};

export const getTokenStateHash = (tokenTemplates: TokenTemplate[], tokens: TokenInstance[]): string => {
  return JSON.stringify({ tokenTemplates, tokens });
};

const rollD20 = (): number => Math.floor(Math.random() * 20) + 1;

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
        if (index === -1) {
          return state;
        }
        const nextTemplate = tokenTemplateSchema.parse({
          ...state.tokenTemplates[index],
          ...partial,
        });
        const tokenTemplates = state.tokenTemplates.slice();
        tokenTemplates[index] = nextTemplate;
        return { tokenTemplates };
      }),
    removeTokenTemplate: (id) =>
      set((state) => {
        const nextTokenTemplates = state.tokenTemplates.filter((template) => template.id !== id);
        if (nextTokenTemplates.length === state.tokenTemplates.length) {
          return state;
        }
        const nextTokens = state.tokens.filter((token) => token.templateId !== id);
        const placementTemplateId = state.placementTemplateId === id ? null : state.placementTemplateId;
        return {
          tokenTemplates: nextTokenTemplates,
          tokens: nextTokens,
          placementTemplateId,
        };
      }),
    addTokenInstance: (templateId, x, y) => {
      const templateExists = get().tokenTemplates.some((template) => template.id === templateId);
      if (!templateExists) {
        return "";
      }
      const token = buildTokenInstance(templateId, x, y);
      set((state) => ({ tokens: state.tokens.concat(token) }));
      return token.id;
    },
    updateTokenInstance: (id, partial) =>
      set((state) => {
        const index = state.tokens.findIndex((token) => token.id === id);
        if (index === -1) {
          return state;
        }
        const nextToken = tokenInstanceSchema.parse({
          ...state.tokens[index],
          ...partial,
        });
        const tokens = state.tokens.slice();
        tokens[index] = nextToken;
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
        if (index === -1) {
          return state;
        }
        const nextToken = tokenInstanceSchema.parse({
          ...state.tokens[index],
          initiative,
        });
        const tokens = state.tokens.slice();
        tokens[index] = nextToken;
        return { tokens };
      }),
    rollInitiative: (tokenId) => {
      const state = get();
      const index = state.tokens.findIndex((token) => token.id === tokenId);
      if (index === -1) {
        return;
      }
      const nextToken = tokenInstanceSchema.parse({
        ...state.tokens[index],
        initiative: rollD20(),
      });
      const tokens = state.tokens.slice();
      tokens[index] = nextToken;
      set({ tokens });
    },
    loadSceneTokens: (tokenTemplates, tokens) => {
      const tokenTemplatesCopy = JSON.parse(JSON.stringify(tokenTemplates)) as TokenTemplate[];
      const tokensCopy = JSON.parse(JSON.stringify(tokens)) as TokenInstance[];
      set({
        tokenTemplates: tokenTemplatesCopy,
        tokens: tokensCopy,
        placementTemplateId: null,
      });
    },
    applySyncedTokens: (tokenTemplates, tokens) => {
      set({
        tokenTemplates,
        tokens,
      });
    },
  }))
);

export type { TokenStoreState };
