import { usePostHog } from "@posthog/react";

import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { useTokenStore } from "@/stores/tokenStore/tokenStore";

export function useInitiativeList(isGM: boolean) {
  const posthog = usePostHog();
  const tokens = useTokenStore((state) => state.tokens);
  const templates = useTokenStore((state) => state.tokenTemplates);
  const hoveredTokenId = useTokenStore((state) => state.hoveredTokenId);
  const setHoveredTokenId = useTokenStore((state) => state.setHoveredTokenId);
  const setInitiative = useTokenStore((state) => state.setInitiative);
  const rollInitiative = useTokenStore((state) => state.rollInitiative);
  const templateById = new Map(templates.map((template) => [template.id, template]));
  const visibleTokens = isGM ? tokens : tokens.filter((token) => !token.hidden);
  const sortedTokens = [...visibleTokens].sort((a, b) => (b.initiative ?? -1) - (a.initiative ?? -1));

  return {
    hoveredTokenId,
    setHoveredTokenId,
    sortedTokens,
    templateById,
    handleInitiativeChange: (tokenId: string, value: number | undefined) => {
      setInitiative(tokenId, value);
      if (!isGM) return;
      posthog.capture(
        value === undefined
          ? ANALYTICS_EVENTS.InitiativeValueCleared
          : ANALYTICS_EVENTS.InitiativeValueSet,
      );
    },
    handleRoll: (tokenId: string) => {
      rollInitiative(tokenId);
      if (!isGM) return;
      posthog.capture(ANALYTICS_EVENTS.InitiativeRolled);
    },
  };
}
