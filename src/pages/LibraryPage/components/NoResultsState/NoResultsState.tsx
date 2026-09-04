import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface NoResultsStateProps {
  onClearFilters: () => void;
}

/** Shown when search/filter yields zero matches but the user has scenes. */
export const NoResultsState = ({ onClearFilters }: NoResultsStateProps) => (
  <div className="flex flex-col items-center justify-center py-28 text-center">
    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-5">
      <Search className="w-7 h-7 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-medium mb-1.5">No matching scenes</h3>
    <p className="text-sm text-muted-foreground mb-5">Try adjusting your search or filters.</p>
    <Button variant="outline" size="sm" onClick={onClearFilters}>
      Clear filters
    </Button>
  </div>
);
