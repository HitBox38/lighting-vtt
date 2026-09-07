import type { TokenInstance, TokenInstanceUpdate, TokenTemplate, TokenTemplateUpdate } from "@shared/index";

export type TokenTemplateCreateInput = Omit<TokenTemplate, "id" | "borderColor"> & {
  borderColor?: string;
};

export interface TokenStoreState {
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
