import { useTokenStore } from "@/stores/tokenStore";
import type {
  TokenInstance,
  TokenInstanceUpdate,
  TokenTemplate,
  TokenTemplateUpdate,
} from "@shared/index";

export type { TokenTemplate, TokenTemplateUpdate, TokenInstance, TokenInstanceUpdate };

export function useTokenManager() {
  const tokenTemplates = useTokenStore((state) => state.tokenTemplates);
  const tokens = useTokenStore((state) => state.tokens);
  const placementTemplateId = useTokenStore((state) => state.placementTemplateId);
  const addTokenTemplate = useTokenStore((state) => state.addTokenTemplate);
  const updateTokenTemplate = useTokenStore((state) => state.updateTokenTemplate);
  const removeTokenTemplate = useTokenStore((state) => state.removeTokenTemplate);
  const addTokenInstance = useTokenStore((state) => state.addTokenInstance);
  const updateTokenInstance = useTokenStore((state) => state.updateTokenInstance);
  const removeTokenInstance = useTokenStore((state) => state.removeTokenInstance);
  const setPlacementTemplateId = useTokenStore((state) => state.setPlacementTemplateId);

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
