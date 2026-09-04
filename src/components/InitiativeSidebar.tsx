import { useMemo, useCallback, useState } from "react";
import { usePostHog } from "@posthog/react";
import {
  ChevronRight,
  Dices,
  Heart,
  Minus,
  Plus,
  RotateCcw,
  Shield,
  SkipForward,
  Sword,
  Zap,
} from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useTokenStore } from "@/stores/tokenStore";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarTrigger } from "@/components/ui/sidebar";
import { DamageLog } from "@/components/DamageLog";

interface Props {
  isGM: boolean;
  sceneId?: string | null;
  creatorId?: string | null;
  round?: number;
  turnIndex?: number;
}

interface InitiativeItemProps {
  tokenId: string;
  tokenName: string;
  initiative: number | undefined;
  currentHp: number | undefined;
  maxHp: number | undefined;
  tempHp: number | undefined;
  ac: number | undefined;
  isGM: boolean;
  isHovered: boolean;
  isActiveTurn: boolean;
  onHover: (tokenId: string | null) => void;
  onInitiativeChange: (tokenId: string, value: number | undefined) => void;
  onRoll: (tokenId: string) => void;
  onApplyDamage: (tokenId: string, delta: number) => void;
  onSetTempHp: (tokenId: string, value: number) => void;
}

function InitiativeItem({
  tokenId,
  tokenName,
  initiative,
  currentHp,
  maxHp,
  tempHp,
  ac,
  isGM,
  isHovered,
  isActiveTurn,
  onHover,
  onInitiativeChange,
  onRoll,
  onApplyDamage,
  onSetTempHp,
}: InitiativeItemProps) {
  const [damageInput, setDamageInput] = useState("");
  const [showControls, setShowControls] = useState(false);

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = event.target.value;
      if (rawValue === "") {
        onInitiativeChange(tokenId, undefined);
        return;
      }
      const numValue = parseInt(rawValue, 10);
      if (!isNaN(numValue) && numValue >= 1 && numValue <= 20) {
        onInitiativeChange(tokenId, numValue);
      }
    },
    [tokenId, onInitiativeChange],
  );

  const handleRollClick = useCallback(() => {
    onRoll(tokenId);
  }, [tokenId, onRoll]);

  const handleDamage = useCallback(() => {
    const val = parseInt(damageInput, 10);
    if (!isNaN(val) && val > 0) {
      onApplyDamage(tokenId, -val);
      setDamageInput("");
    }
  }, [tokenId, damageInput, onApplyDamage]);

  const handleHeal = useCallback(() => {
    const val = parseInt(damageInput, 10);
    if (!isNaN(val) && val > 0) {
      onApplyDamage(tokenId, val);
      setDamageInput("");
    }
  }, [tokenId, damageInput, onApplyDamage]);

  const handleTempHp = useCallback(() => {
    const val = parseInt(damageInput, 10);
    if (!isNaN(val) && val >= 0) {
      onSetTempHp(tokenId, val);
      setDamageInput("");
    }
  }, [tokenId, damageInput, onSetTempHp]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleDamage();
      }
    },
    [handleDamage],
  );

  const hasHp = currentHp !== undefined || maxHp !== undefined;

  // Determine HP color
  const hpRatio = maxHp && maxHp > 0 && currentHp !== undefined ? currentHp / maxHp : 1;
  const hpColor =
    hpRatio <= 0
      ? "text-red-500"
      : hpRatio <= 0.25
        ? "text-red-400"
        : hpRatio <= 0.5
          ? "text-yellow-400"
          : "text-green-400";

  return (
    <div
      className={cn(
        "rounded-md px-2 py-1.5 transition-colors",
        isHovered && "bg-accent",
        isActiveTurn && "ring-primary/50 bg-primary/10 ring-1",
      )}
      onMouseEnter={() => onHover(tokenId)}
      onMouseLeave={() => onHover(null)}>
      {/* Main row */}
      <div className="flex items-center gap-2">
        {isActiveTurn && <ChevronRight className="text-primary size-3.5 shrink-0" />}
        {isGM && (
          <>
            <Input
              type="number"
              min={1}
              max={20}
              value={initiative ?? ""}
              onChange={handleInputChange}
              placeholder="--"
              className="h-7 w-12 px-1.5 text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <Button variant="ghost" size="icon-xs" onClick={handleRollClick} title="Roll d20">
              <Dices className="size-3.5" />
            </Button>
          </>
        )}
        <span className="min-w-0 flex-1 truncate text-sm">{tokenName}</span>

        {/* HP / AC display */}
        {hasHp && (
          <div className="flex items-center gap-1.5 text-xs tabular-nums">
            {ac !== undefined && (
              <span className="text-muted-foreground flex items-center gap-0.5" title="AC">
                <Shield className="size-3" />
                {ac}
              </span>
            )}
            <span className={cn("flex items-center gap-0.5", hpColor)} title="HP">
              <Heart className="size-3" />
              {currentHp ?? 0}
              {tempHp !== undefined && tempHp > 0 && (
                <span className="text-blue-400">+{tempHp}</span>
              )}
              {maxHp !== undefined && <span className="text-muted-foreground">/{maxHp}</span>}
            </span>
          </div>
        )}

        {isGM && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setShowControls(!showControls)}
            title="Damage/Heal">
            <Zap className="size-3.5" />
          </Button>
        )}
      </div>

      {/* Expandable damage/heal controls (GM only) */}
      {isGM && showControls && (
        <div className="mt-1.5 flex items-center gap-1 pl-5">
          <Input
            type="number"
            min={0}
            value={damageInput}
            onChange={(e) => setDamageInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Amount"
            className="h-6 w-16 px-1 text-center text-xs [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <Button
            variant="destructive"
            size="icon-xs"
            onClick={handleDamage}
            title="Damage"
            className="h-6 w-6">
            <Minus className="size-3" />
          </Button>
          <Button
            variant="default"
            size="icon-xs"
            onClick={handleHeal}
            title="Heal"
            className="h-6 w-6 bg-green-600 hover:bg-green-700">
            <Plus className="size-3" />
          </Button>
          <Button
            variant="secondary"
            size="icon-xs"
            onClick={handleTempHp}
            title="Set Temp HP"
            className="h-6 w-6">
            <Shield className="size-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function InitiativeSidebar({ isGM, sceneId, creatorId, round, turnIndex }: Props) {
  const posthog = usePostHog();
  const tokens = useTokenStore((state) => state.tokens);
  const templates = useTokenStore((state) => state.tokenTemplates);
  const hoveredTokenId = useTokenStore((state) => state.hoveredTokenId);
  const setHoveredTokenId = useTokenStore((state) => state.setHoveredTokenId);
  const setInitiative = useTokenStore((state) => state.setInitiative);
  const rollInitiative = useTokenStore((state) => state.rollInitiative);

  const applyDamageMutation = useMutation(api.tokens.applyDamage);
  const setTempHpMutation = useMutation(api.tokens.setTempHp);
  const advanceTurnMutation = useMutation(api.scenes.advanceTurn);
  const resetCombatMutation = useMutation(api.scenes.resetCombat);

  const templateById = useMemo(() => {
    const map = new Map<string, (typeof templates)[number]>();
    for (const template of templates) {
      map.set(template.id, template);
    }
    return map;
  }, [templates]);

  const visibleTokens = useMemo(
    () => (isGM ? tokens : tokens.filter((token) => !token.hidden)),
    [isGM, tokens],
  );

  const sortedTokens = useMemo(() => {
    return [...visibleTokens].sort((a, b) => {
      const initA = a.initiative ?? -1;
      const initB = b.initiative ?? -1;
      return initB - initA;
    });
  }, [visibleTokens]);

  // The token whose turn it is (based on turnIndex in the sorted list)
  const activeTurnTokenId = useMemo(() => {
    const tokensWithInit = sortedTokens.filter((t) => t.initiative !== undefined);
    if (tokensWithInit.length === 0 || turnIndex === undefined) return null;
    const idx = turnIndex % tokensWithInit.length;
    return tokensWithInit[idx]?.id ?? null;
  }, [sortedTokens, turnIndex]);

  const handleInitiativeChange = useCallback(
    (tokenId: string, value: number | undefined) => {
      setInitiative(tokenId, value);
      if (!isGM) return;
      if (value === undefined) {
        posthog.capture(ANALYTICS_EVENTS.InitiativeValueCleared);
        return;
      }
      posthog.capture(ANALYTICS_EVENTS.InitiativeValueSet);
    },
    [setInitiative, isGM, posthog],
  );

  const handleRoll = useCallback(
    (tokenId: string) => {
      rollInitiative(tokenId);
      if (!isGM) return;
      posthog.capture(ANALYTICS_EVENTS.InitiativeRolled);
    },
    [rollInitiative, isGM, posthog],
  );

  const handleApplyDamage = useCallback(
    async (tokenId: string, delta: number) => {
      if (!sceneId || !creatorId) return;
      try {
        await applyDamageMutation({
          sceneId: sceneId as Id<"scenes">,
          creatorId,
          tokenId,
          delta,
        });
        posthog.capture(delta < 0 ? ANALYTICS_EVENTS.DamageApplied : ANALYTICS_EVENTS.HealApplied);
      } catch (error) {
        console.error("Failed to apply damage:", error);
      }
    },
    [sceneId, creatorId, applyDamageMutation, posthog],
  );

  const handleSetTempHp = useCallback(
    async (tokenId: string, value: number) => {
      if (!sceneId || !creatorId) return;
      try {
        await setTempHpMutation({
          sceneId: sceneId as Id<"scenes">,
          creatorId,
          tokenId,
          tempHp: value,
        });
        posthog.capture(ANALYTICS_EVENTS.TempHpSet);
      } catch (error) {
        console.error("Failed to set temp HP:", error);
      }
    },
    [sceneId, creatorId, setTempHpMutation, posthog],
  );

  const handleAdvanceTurn = useCallback(async () => {
    if (!sceneId || !creatorId) return;
    try {
      await advanceTurnMutation({
        id: sceneId as Id<"scenes">,
        creatorId,
      });
      posthog.capture(ANALYTICS_EVENTS.TurnAdvanced);
    } catch (error) {
      console.error("Failed to advance turn:", error);
    }
  }, [sceneId, creatorId, advanceTurnMutation, posthog]);

  const handleResetCombat = useCallback(async () => {
    if (!sceneId || !creatorId) return;
    try {
      await resetCombatMutation({
        id: sceneId as Id<"scenes">,
        creatorId,
      });
      posthog.capture(ANALYTICS_EVENTS.CombatReset);
    } catch (error) {
      console.error("Failed to reset combat:", error);
    }
  }, [sceneId, creatorId, resetCombatMutation, posthog]);

  const currentRound = round ?? 1;
  const hasInitiative = sortedTokens.some((t) => t.initiative !== undefined);

  return (
    <Sidebar>
      <SidebarHeader className="flex-row items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2">
          <Sword className="size-4" />
          <span className="text-sm font-semibold">Initiative</span>
          {hasInitiative && (
            <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs">
              Round {currentRound}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isGM && hasInitiative && (
            <>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleAdvanceTurn}
                title="Next Turn">
                <SkipForward className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleResetCombat}
                title="Reset Combat">
                <RotateCcw className="size-3.5" />
              </Button>
            </>
          )}
          <SidebarTrigger />
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-0.5">
        {sortedTokens.length === 0 ? (
          <p className="text-muted-foreground px-2 py-4 text-center text-xs">
            No tokens on the map
          </p>
        ) : (
          sortedTokens.map((token) => {
            const template = templateById.get(token.templateId);
            const name = template?.name ?? "Unknown";
            return (
              <InitiativeItem
                key={token.id}
                tokenId={token.id}
                tokenName={name}
                initiative={token.initiative}
                currentHp={token.currentHp}
                maxHp={token.maxHp}
                tempHp={token.tempHp}
                ac={token.ac}
                isGM={isGM}
                isHovered={hoveredTokenId === token.id}
                isActiveTurn={token.id === activeTurnTokenId}
                onHover={setHoveredTokenId}
                onInitiativeChange={handleInitiativeChange}
                onRoll={handleRoll}
                onApplyDamage={handleApplyDamage}
                onSetTempHp={handleSetTempHp}
              />
            );
          })
        )}
      </SidebarContent>
      <SidebarFooter className="p-0">
        <DamageLog isGM={isGM} />
      </SidebarFooter>
    </Sidebar>
  );
}

export default InitiativeSidebar;
