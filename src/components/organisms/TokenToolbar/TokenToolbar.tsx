import { useState } from "react";
import { usePostHog } from "@posthog/react";

import { HudSurface } from "@/components/atoms/HudSurface";
import { CreateTokenDialog } from "@/components/organisms/TokenToolbar/components/CreateTokenDialog";
import { TokenTemplateSearch } from "@/components/organisms/TokenToolbar/components/TokenTemplateSearch";
import { useCreateTokenForm } from "@/components/organisms/TokenToolbar/hooks/useCreateTokenForm";
import { useTokenManager } from "@/stores/tokenStore/hooks/useTokenManager";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { useDeleteUploadedFile } from "@/utils/uploadthing";

export function TokenToolbar() {
  const deleteUploadedFile = useDeleteUploadedFile();
  const posthog = usePostHog();
  const form = useCreateTokenForm();
  const { tokenTemplates, tokens, placementTemplateId, removeTokenTemplate, setPlacementTemplateId } =
    useTokenManager();
  const [searchQuery, setSearchQuery] = useState("");

  const tokenCountByTemplateId = new Map<string, number>();
  for (const token of tokens) {
    tokenCountByTemplateId.set(token.templateId, (tokenCountByTemplateId.get(token.templateId) ?? 0) + 1);
  }

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredTemplates = normalizedQuery
    ? tokenTemplates.filter((template) => template.name.toLowerCase().includes(normalizedQuery))
    : tokenTemplates;
  const activePlacementTemplate = tokenTemplates.find(
    (template) => template.id === placementTemplateId,
  );
  const hasTemplates = tokenTemplates.length > 0;
  const searchPlaceholder = hasTemplates
    ? activePlacementTemplate
      ? `Placing: ${activePlacementTemplate.name}`
      : "Search token template…"
    : "No token templates yet";

  return (
    <HudSurface className="flex-wrap items-center">
      <CreateTokenDialog form={form} />
      <TokenTemplateSearch
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        templates={filteredTemplates}
        placementTemplateId={placementTemplateId}
        placeholder={searchPlaceholder}
        hasTemplates={hasTemplates}
        tokenCountByTemplateId={tokenCountByTemplateId}
        onSelect={(templateId) => {
          if (placementTemplateId !== templateId) {
            posthog.capture(ANALYTICS_EVENTS.TokenPlacementModeSelected);
          }
          setPlacementTemplateId(templateId);
          setSearchQuery("");
        }}
        onClearPlacement={() => {
          setPlacementTemplateId(null);
          setSearchQuery("");
        }}
        onDelete={(templateId, imageKeyToDelete) => {
          if (placementTemplateId === templateId) {
            setPlacementTemplateId(null);
          }
          removeTokenTemplate(templateId);
          void deleteUploadedFile(imageKeyToDelete).catch((error) => {
            console.error("Failed to delete token template image:", error);
          });
        }}
      />
    </HudSurface>
  );
}
