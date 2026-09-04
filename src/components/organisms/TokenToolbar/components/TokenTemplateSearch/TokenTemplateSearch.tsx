import { Search, X } from "lucide-react";
import type { TokenTemplate } from "@shared/index";

import { TokenTemplateOption } from "@/components/organisms/TokenToolbar/components/TokenTemplateOption";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Button } from "@/components/ui/button";

interface TokenTemplateSearchProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  templates: TokenTemplate[];
  placementTemplateId: string | null;
  placeholder: string;
  hasTemplates: boolean;
  tokenCountByTemplateId: Map<string, number>;
  onSelect: (templateId: string) => void;
  onClearPlacement: () => void;
  onDelete: (templateId: string, imageKey: string) => void;
}

export function TokenTemplateSearch({
  searchQuery,
  onSearchChange,
  templates,
  placementTemplateId,
  placeholder,
  hasTemplates,
  tokenCountByTemplateId,
  onSelect,
  onClearPlacement,
  onDelete,
}: TokenTemplateSearchProps) {
  return (
    <Autocomplete
      className="w-72 max-w-72"
      inputClassName="h-8"
      value={searchQuery}
      onValueChange={onSearchChange}
      options={templates}
      onSelectOption={(template) => onSelect(template.id)}
      getOptionKey={(template) => template.id}
      isOptionSelected={(template) => placementTemplateId === template.id}
      placeholder={placeholder}
      disabled={!hasTemplates}
      emptyMessage={hasTemplates ? "No token templates match your search." : "No token templates yet"}
      name="tokenTemplateSearch"
      ariaLabel="Search token templates"
      leftAdornment={<Search className="size-4" />}
      rightAdornment={
        placementTemplateId ? (
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            onMouseDown={(event) => event.preventDefault()}
            onClick={onClearPlacement}
            aria-label="Clear active token placement">
            <X className="size-3" aria-hidden="true" />
          </Button>
        ) : null
      }
      renderOption={({ option, optionId, isHighlighted, isSelected, selectOption }) => (
        <TokenTemplateOption
          option={option}
          optionId={optionId}
          isHighlighted={isHighlighted}
          isSelected={isSelected}
          tokenCount={tokenCountByTemplateId.get(option.id) ?? 0}
          selectOption={selectOption}
          onDelete={onDelete}
        />
      )}
    />
  );
}
