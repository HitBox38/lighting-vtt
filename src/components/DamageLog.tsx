import { useMemo, useState, useCallback } from "react";
import { ChevronDown, ChevronUp, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTokenStore } from "@/stores/tokenStore";

interface DamageLogProps {
  isGM: boolean;
}

interface FlatEntry {
  tokenId: string;
  tokenName: string;
  timestamp: number;
  delta: number;
  source?: string;
  round?: number;
}

export function DamageLog({ isGM }: DamageLogProps) {
  const [expanded, setExpanded] = useState(false);
  const [filterTokenId, setFilterTokenId] = useState<string>("all");
  const [filterRound, setFilterRound] = useState<string>("all");

  const tokens = useTokenStore((state) => state.tokens);
  const templates = useTokenStore((state) => state.tokenTemplates);

  const templateById = useMemo(() => {
    const map = new Map<string, (typeof templates)[number]>();
    for (const t of templates) map.set(t.id, t);
    return map;
  }, [templates]);

  // Flatten all damage log entries across all tokens
  const flatEntries = useMemo<FlatEntry[]>(() => {
    const entries: FlatEntry[] = [];
    for (const token of tokens) {
      if (!token.damageLog || token.damageLog.length === 0) continue;
      const template = templateById.get(token.templateId);
      const name = template?.name ?? "Unknown";
      for (const entry of token.damageLog) {
        entries.push({
          tokenId: token.id,
          tokenName: name,
          timestamp: entry.timestamp,
          delta: entry.delta,
          source: entry.source,
          round: entry.round,
        });
      }
    }
    entries.sort((a, b) => b.timestamp - a.timestamp);
    return entries;
  }, [tokens, templateById]);

  // Unique rounds for filter dropdown
  const availableRounds = useMemo(() => {
    const rounds = new Set<number>();
    for (const e of flatEntries) {
      if (e.round !== undefined) rounds.add(e.round);
    }
    return Array.from(rounds).sort((a, b) => a - b);
  }, [flatEntries]);

  // Unique combatants for filter dropdown
  const availableCombatants = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of flatEntries) {
      if (!map.has(e.tokenId)) map.set(e.tokenId, e.tokenName);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [flatEntries]);

  // Apply filters
  const filteredEntries = useMemo(() => {
    return flatEntries.filter((e) => {
      if (filterTokenId !== "all" && e.tokenId !== filterTokenId) return false;
      if (filterRound !== "all" && String(e.round) !== filterRound) return false;
      return true;
    });
  }, [flatEntries, filterTokenId, filterRound]);

  const toggleExpanded = useCallback(() => setExpanded((p) => !p), []);

  if (!isGM || flatEntries.length === 0) return null;

  const isFromSync = (source?: string) => source?.startsWith("iinit:");

  return (
    <div className="border-t">
      {/* Toggle header */}
      <button
        onClick={toggleExpanded}
        className="hover:bg-accent flex w-full items-center gap-2 px-3 py-2 text-left transition-colors">
        <ScrollText className="size-3.5 shrink-0" />
        <span className="text-xs font-medium">
          Damage Log ({flatEntries.length})
        </span>
        {expanded ? (
          <ChevronUp className="ml-auto size-3.5" />
        ) : (
          <ChevronDown className="ml-auto size-3.5" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3">
          {/* Filters */}
          <div className="mb-2 flex gap-2">
            <Select value={filterTokenId} onValueChange={setFilterTokenId}>
              <SelectTrigger className="h-7 flex-1 text-xs">
                <SelectValue placeholder="All combatants" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All combatants</SelectItem>
                {availableCombatants.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterRound} onValueChange={setFilterRound}>
              <SelectTrigger className="h-7 w-24 text-xs">
                <SelectValue placeholder="All rounds" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {availableRounds.map((r) => (
                  <SelectItem key={r} value={String(r)}>
                    Rnd {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Entries */}
          <div className="max-h-48 space-y-0.5 overflow-y-auto">
            {filteredEntries.length === 0 ? (
              <p className="text-muted-foreground py-2 text-center text-xs">
                No entries match filters
              </p>
            ) : (
              filteredEntries.map((entry, i) => (
                <div
                  key={`${entry.tokenId}-${entry.timestamp}-${i}`}
                  className="flex items-center gap-1.5 rounded px-1.5 py-1 text-xs">
                  {entry.round !== undefined && (
                    <span className="text-muted-foreground w-6 shrink-0 tabular-nums">
                      R{entry.round}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate">{entry.tokenName}</span>
                  <span
                    className={cn(
                      "shrink-0 font-mono tabular-nums",
                      entry.delta < 0 ? "text-red-400" : "text-green-400",
                    )}>
                    {entry.delta > 0 ? "+" : ""}
                    {entry.delta}
                  </span>
                  {isFromSync(entry.source) && (
                    <span
                      className="bg-muted text-muted-foreground rounded px-1 py-0.5 text-[10px]"
                      title={`Synced from ${entry.source}`}>
                      II
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DamageLog;
