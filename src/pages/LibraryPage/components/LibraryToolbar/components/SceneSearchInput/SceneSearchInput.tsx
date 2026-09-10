import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

interface SceneSearchInputProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function SceneSearchInput({ searchQuery, onSearchChange }: SceneSearchInputProps) {
  return (
    <div className="relative w-full lg:max-w-md lg:flex-1">
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        aria-label="Search scenes"
        placeholder="Search scenes..."
        value={searchQuery}
        onChange={(event) => onSearchChange(event.target.value)}
        className="h-11 pr-12 pl-9 sm:h-9"
      />
      {searchQuery ? (
        <button
          type="button"
          onClick={() => onSearchChange("")}
          className="absolute top-1/2 right-0 grid size-11 -translate-y-1/2 place-items-center rounded-sm sm:right-2 sm:size-6 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Clear search">
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
