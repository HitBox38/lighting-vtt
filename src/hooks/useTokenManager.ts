import { useLightStore } from "@/stores/lightStore";
import type {
  TokenInstance,
  TokenInstanceUpdate,
  TokenTemplate,
  TokenTemplateUpdate,
} from "@shared/index";

export type { TokenTemplate, TokenTemplateUpdate, TokenInstance, TokenInstanceUpdate };

export function useTokenManager() {
  const tokenTemplates = useLightStore((state) => state.tokenTemplates);
  const tokens = useLightStore((state) => state.tokens);
  const placementTemplateId = useLightStore((state) => state.placementTemplateId);
  const addTokenTemplate = useLightStore((state) => state.addTokenTemplate);
  const updateTokenTemplate = useLightStore((state) => state.updateTokenTemplate);
  const removeTokenTemplate = useLightStore((state) => state.removeTokenTemplate);
  const addTokenInstance = useLightStore((state) => state.addTokenInstance);
  const updateTokenInstance = useLightStore((state) => state.updateTokenInstance);
  const removeTokenInstance = useLightStore((state) => state.removeTokenInstance);
  const setPlacementTemplateId = useLightStore((state) => state.setPlacementTemplateId);

  return {
    tokenTemplates,
    tokens,
    placementTemplateId,
    addTokenTemplate,
    updateTokenTemplate,
    removeTokenTemplate,
    addTokenInstance,
    updateTokenInstance,
    removeTokenInstance,
    setPlacementTemplateId,
  };
}
