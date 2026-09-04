import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

interface SceneSearchInputProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function SceneSearchInput({ searchQuery, onSearchChange }: SceneSearchInputProps) {
  return (
    <div className="relative max-w-md flex-1">
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search scenes..."
        value={searchQuery}
        onChange={(event) => onSearchChange(event.target.value)}
        className="h-9 pr-8 pl-9"
      />
      {searchQuery ? (
        <button
          type="button"
          onClick={() => onSearchChange("")}
          className="absolute top-1/2 right-2.5 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Clear search">
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
