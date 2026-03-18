import { useEffect, useMemo, useState, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import {
  Check,
  ClipboardCopy,
  Crown,
  Link2,
  Pencil,
  RefreshCw,
  Shield,
  Sparkles,
  Sword,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { ScenePlayer } from "@shared/index";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HudSurface } from "@/components/hud/HudSurface";
import { useTokenStore } from "@/stores/tokenStore";
import { useLightStore } from "@/stores/lightStore";
import { cn } from "@/lib/utils";

type TokenTemplate = { id: string; name: string; imageUrl: string; borderColor: string };
type TokenInstance = { id: string; templateId: string };
type AssignedToken = { instanceId: string; template: TokenTemplate };

interface PlayerCardProps {
  player: ScenePlayer;
  sceneId: Id<"scenes">;
  creatorId: string;
  isActive: boolean;
  tokenTemplates: TokenTemplate[];
  tokenInstances: TokenInstance[];
}

function PlayerCard({
  player,
  sceneId,
  creatorId,
  isActive,
  tokenTemplates,
  tokenInstances,
}: PlayerCardProps) {
  const updatePlayer = useMutation(api.players.updatePlayer);
  const removePlayer = useMutation(api.players.removePlayer);
  const setPlayerActive = useMutation(api.players.setPlayerActive);

  const [isEditing, setIsEditing] = useState(false);
  const [editPlayerName, setEditPlayerName] = useState(player.playerName);
  const [editCharacterName, setEditCharacterName] = useState(player.characterName);

  const assignedTokens = useMemo((): AssignedToken[] => {
    return player.tokenInstanceIds
      .map((tokenId) => {
        const instance = tokenInstances.find((t) => t.id === tokenId);
        if (!instance) return null;
        const template = tokenTemplates.find((t) => t.id === instance.templateId);
        if (!template) return null;
        return { instanceId: tokenId, template };
      })
      .filter((t): t is AssignedToken => t !== null);
  }, [player.tokenInstanceIds, tokenInstances, tokenTemplates]);

  const unassignedTokenInstances = useMemo((): AssignedToken[] => {
    const allAssignedIds = new Set<string>();
    return tokenInstances
      .filter((inst) => !allAssignedIds.has(inst.id))
      .map((inst) => {
        const template = tokenTemplates.find((t) => t.id === inst.templateId);
        return template ? { instanceId: inst.id, template } : null;
      })
      .filter((t): t is AssignedToken => t !== null);
  }, [tokenInstances, tokenTemplates]);

  const handleSaveEdit = useCallback(async () => {
    if (!editPlayerName.trim() || !editCharacterName.trim()) return;
    await updatePlayer({
      sceneId,
      creatorId,
      playerId: player.id,
      playerName: editPlayerName.trim(),
      characterName: editCharacterName.trim(),
    });
    setIsEditing(false);
  }, [editPlayerName, editCharacterName, updatePlayer, sceneId, creatorId, player.id]);

  const handleCancelEdit = useCallback(() => {
    setEditPlayerName(player.playerName);
    setEditCharacterName(player.characterName);
    setIsEditing(false);
  }, [player.playerName, player.characterName]);

  const handleRemove = useCallback(async () => {
    await removePlayer({ sceneId, creatorId, playerId: player.id });
  }, [removePlayer, sceneId, creatorId, player.id]);

  const handleToggleActive = useCallback(async () => {
    await setPlayerActive({
      sceneId,
      creatorId,
      playerId: player.id,
      active: !isActive,
    });
  }, [setPlayerActive, sceneId, creatorId, player.id, isActive]);

  const handleAssignToken = useCallback(
    async (tokenInstanceId: string) => {
      const nextIds = [...player.tokenInstanceIds, tokenInstanceId];
      await updatePlayer({
        sceneId,
        creatorId,
        playerId: player.id,
        tokenInstanceIds: nextIds,
      });
    },
    [player.tokenInstanceIds, updatePlayer, sceneId, creatorId, player.id],
  );

  const handleUnassignToken = useCallback(
    async (tokenInstanceId: string) => {
      const nextIds = player.tokenInstanceIds.filter((id) => id !== tokenInstanceId);
      await updatePlayer({
        sceneId,
        creatorId,
        playerId: player.id,
        tokenInstanceIds: nextIds,
      });
    },
    [player.tokenInstanceIds, updatePlayer, sceneId, creatorId, player.id],
  );

  return (
    <div
      className={cn(
        "group relative rounded-xl border p-4 transition-all duration-200",
        "bg-linear-to-br from-card to-card/80",
        "hover:shadow-md hover:border-primary/20",
        isActive && [
          "border-amber-500/50 shadow-lg",
          "bg-linear-to-br from-amber-950/20 via-card to-card",
          "ring-1 ring-amber-500/20",
        ],
      )}>
      {isActive && (
        <div className="absolute -top-px left-4 right-4 h-px bg-linear-to-r from-transparent via-amber-500/60 to-transparent" />
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="space-y-3 animate-in fade-in-0 slide-in-from-top-1 duration-200">
              <div className="space-y-1.5">
                <Label
                  htmlFor={`pn-${player.id}`}
                  className="text-xs font-medium text-muted-foreground">
                  Player Name
                </Label>
                <Input
                  id={`pn-${player.id}`}
                  value={editPlayerName}
                  onChange={(e) => setEditPlayerName(e.target.value)}
                  className="h-8 text-sm bg-background/50 focus-visible:ring-primary/50"
                  placeholder="Enter player name…"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor={`cn-${player.id}`}
                  className="text-xs font-medium text-muted-foreground">
                  Character Name
                </Label>
                <Input
                  id={`cn-${player.id}`}
                  value={editCharacterName}
                  onChange={(e) => setEditCharacterName(e.target.value)}
                  className="h-8 text-sm bg-background/50 focus-visible:ring-primary/50"
                  placeholder="Enter character name…"
                  autoComplete="off"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => void handleSaveEdit()}>
                  <Check className="size-3" aria-hidden="true" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1.5"
                  onClick={handleCancelEdit}>
                  <X className="size-3" aria-hidden="true" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in-0 duration-150">
              <div className="flex items-center gap-2 mb-0.5">
                <h4 className="text-sm font-semibold tracking-tight truncate">
                  {player.playerName}
                </h4>
                {player.clerkUserId && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4 shrink-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                    <Shield className="size-2.5 mr-0.5" aria-hidden="true" />
                    Verified
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                <Crown className="size-3 text-amber-500/80 shrink-0" aria-hidden="true" />
                <span className="font-medium">{player.characterName}</span>
              </p>
            </div>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "size-7 transition-all duration-200",
                    isActive && [
                      "bg-amber-500 hover:bg-amber-600 text-amber-950",
                      "shadow-sm shadow-amber-500/30",
                    ],
                  )}
                  onClick={() => void handleToggleActive()}
                  aria-label={isActive ? "Revoke turn" : "Grant turn"}>
                  <Sword className="size-3.5" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {isActive ? "Revoke Turn" : "Grant Turn"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 hover:bg-primary/10"
                  onClick={() => setIsEditing(true)}
                  aria-label="Edit player">
                  <Pencil className="size-3.5" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Edit Player
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => void handleRemove()}
                  aria-label="Remove player">
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Remove Player
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {isActive && (
        <div className="mt-3 animate-in fade-in-0 slide-in-from-top-1 duration-300">
          <Badge className="bg-amber-500/90 hover:bg-amber-500 text-amber-950 text-[10px] font-semibold gap-1.5 shadow-sm">
            <Sparkles className="size-3 animate-pulse" aria-hidden="true" />
            Active Turn
          </Badge>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-border/50">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Tokens
        </p>
        {assignedTokens.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {assignedTokens.map(({ instanceId, template }) => (
              <div
                key={instanceId}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-2 py-1",
                  "bg-linear-to-r from-muted/60 to-muted/30",
                  "hover:from-muted/80 hover:to-muted/50 transition-colors",
                )}>
                <img
                  src={template.imageUrl}
                  alt={`${template.name} token`}
                  width={18}
                  height={18}
                  className="size-[18px] rounded-full object-cover"
                  style={{
                    boxShadow: `0 0 0 1.5px ${template.borderColor}, 0 0 0 3px hsl(var(--background))`,
                  }}
                />
                <span className="text-[11px] font-medium">{template.name}</span>
                <button
                  type="button"
                  className="ml-0.5 p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  onClick={() => void handleUnassignToken(instanceId)}
                  aria-label={`Unassign ${template.name}`}>
                  <X className="size-3" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground/70 italic">No tokens assigned</p>
        )}

        {unassignedTokenInstances.length > 0 && (
          <div className="mt-3 animate-in fade-in-0 duration-200">
            <p className="text-[10px] text-muted-foreground mb-1.5">Click to assign:</p>
            <div className="flex flex-wrap gap-1.5">
              {unassignedTokenInstances.map(({ instanceId, template }) => (
                <button
                  key={instanceId}
                  type="button"
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border border-dashed",
                    "px-2 py-1 text-[11px] font-medium",
                    "hover:border-primary/50 hover:bg-primary/5",
                    "active:scale-95 transition-all duration-150",
                  )}
                  onClick={() => void handleAssignToken(instanceId)}>
                  <img
                    src={template.imageUrl}
                    alt={`${template.name} token`}
                    width={18}
                    height={18}
                    className="size-[18px] rounded-full object-cover opacity-70"
                    style={{ border: `1.5px solid ${template.borderColor}` }}
                  />
                  {template.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface InviteLinkSectionProps {
  sceneId: Id<"scenes">;
  creatorId: string;
  existingInviteCode: string | undefined;
}

function InviteLinkSection({ sceneId, creatorId, existingInviteCode }: InviteLinkSectionProps) {
  const createInviteCode = useMutation(api.players.createInviteCode);
  const regenerateInviteCode = useMutation(api.players.regenerateInviteCode);
  const [copied, setCopied] = useState(false);

  const inviteUrl = existingInviteCode
    ? `${window.location.origin}/join/${existingInviteCode}`
    : null;

  const handleGenerateCode = useCallback(async () => {
    await createInviteCode({ sceneId, creatorId });
  }, [createInviteCode, sceneId, creatorId]);

  const handleRegenerateCode = useCallback(async () => {
    await regenerateInviteCode({ sceneId, creatorId });
  }, [regenerateInviteCode, sceneId, creatorId]);

  const handleCopyLink = useCallback(async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [inviteUrl]);

  if (!existingInviteCode) {
    return (
      <div
        className={cn(
          "rounded-xl border-2 border-dashed border-primary/20 p-5",
          "bg-linear-to-br from-primary/5 via-transparent to-transparent",
          "text-center space-y-3",
        )}>
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Link2 className="size-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-medium mb-1">Share Your Table</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Generate an invite link so players can join this scene remotely.
          </p>
        </div>
        <Button size="sm" className="gap-2 shadow-sm" onClick={() => void handleGenerateCode()}>
          <Sparkles className="size-3.5" aria-hidden="true" />
          Generate Invite Link
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border p-4 space-y-3",
        "bg-linear-to-br from-emerald-500/5 via-transparent to-transparent",
      )}>
      <div className="flex items-center gap-2">
        <div className="size-7 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <Link2 className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        </div>
        <div>
          <Label className="text-xs font-semibold">Invite Link</Label>
          <p className="text-[10px] text-muted-foreground">Share with players to join</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Input
          readOnly
          value={inviteUrl ?? ""}
          className={cn(
            "h-9 text-xs font-mono bg-background/50",
            "focus-visible:ring-emerald-500/50",
          )}
          onFocus={(e) => e.target.select()}
          aria-label="Invite link URL"
          autoComplete="off"
        />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant={copied ? "default" : "outline"}
              className={cn(
                "size-9 shrink-0 transition-all duration-200",
                copied && "bg-emerald-500 hover:bg-emerald-600 border-emerald-500",
              )}
              onClick={() => void handleCopyLink()}
              aria-label={copied ? "Copied to clipboard" : "Copy link"}>
              {copied ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <ClipboardCopy className="size-4" aria-hidden="true" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs">{copied ? "Copied!" : "Copy Link"}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              className="size-9 shrink-0"
              onClick={() => void handleRegenerateCode()}
              aria-label="Regenerate invite link">
              <RefreshCw className="size-4" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs max-w-[180px] text-center">
            Regenerate Link
            <span className="block text-muted-foreground">Invalidates previous link</span>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

interface PlayersSheetProps {
  sceneId: string;
}

const EmptyPlayersState = () => (
  <div className="text-center py-10 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
    <div
      className={cn(
        "mx-auto w-16 h-16 rounded-2xl mb-4",
        "bg-linear-to-br from-muted/80 to-muted/40",
        "flex items-center justify-center",
        "shadow-inner",
      )}>
      <UserPlus className="size-7 text-muted-foreground/60" aria-hidden="true" />
    </div>
    <p className="text-sm font-medium mb-1">No Adventurers Yet</p>
    <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px] mx-auto">
      Share your invite link to assemble your party
    </p>
  </div>
);

export function PlayersSheet({ sceneId }: PlayersSheetProps) {
  const { user } = useUser();
  const creatorId = user?.id ?? "";

  const scene = useQuery(api.scenes.getById, sceneId ? { id: sceneId as Id<"scenes"> } : "skip");

  const tokenTemplates = useTokenStore((s) => s.tokenTemplates);
  const tokens = useTokenStore((s) => s.tokens);

  const players: ScenePlayer[] = useMemo(
    () => (scene?.players as ScenePlayer[] | undefined) ?? [],
    [scene?.players],
  );
  const activePlayerIds: string[] = useMemo(
    () => (scene?.activePlayerIds as string[] | undefined) ?? [],
    [scene?.activePlayerIds],
  );
  const inviteCode = scene?.inviteCode as string | undefined;

  const tokenInstancesForAssignment = useMemo<TokenInstance[]>(
    () => tokens.map((t) => ({ id: t.id, templateId: t.templateId })),
    [tokens],
  );

  const tokenTemplatesForDisplay = useMemo<TokenTemplate[]>(
    () =>
      tokenTemplates.map((t) => ({
        id: t.id,
        name: t.name,
        imageUrl: t.imageUrl,
        borderColor: t.borderColor,
      })),
    [tokenTemplates],
  );

  const dmHeartbeat = useMutation(api.players.dmHeartbeat);
  const storeSceneId = useLightStore((s) => s.sceneId);

  useEffect(() => {
    if (!storeSceneId || !creatorId) return;

    const sendHeartbeat = () => {
      void dmHeartbeat({
        sceneId: storeSceneId as Id<"scenes">,
        creatorId,
      });
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 20_000);
    return () => clearInterval(interval);
  }, [storeSceneId, creatorId, dmHeartbeat]);

  const activeCount = useMemo(
    () => players.filter((p) => activePlayerIds.includes(p.id)).length,
    [players, activePlayerIds],
  );

  return (
    <TooltipProvider delayDuration={150}>
      <Sheet>
        <SheetTrigger asChild>
          <HudSurface className="items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className={cn(
                    "gap-2 transition-all duration-200",
                    activeCount > 0 && "border-amber-500/30 shadow-sm shadow-amber-500/10",
                  )}>
                  <Users className="size-4" aria-hidden="true" />
                  <span>Players</span>
                  {players.length > 0 && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px] px-1.5 py-0 h-4 font-semibold tabular-nums",
                        activeCount > 0 && "bg-amber-500/20 text-amber-600 dark:text-amber-400",
                      )}>
                      {players.length}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Manage Players &amp; Invites
              </TooltipContent>
            </Tooltip>
          </HudSurface>
        </SheetTrigger>

        <SheetContent
          side="right"
          className={cn(
            "flex flex-col w-[420px] sm:max-w-[420px] px-4",
            "bg-linear-to-b from-background via-background to-muted/20",
            "*:data-radix-scroll-area-viewport:overscroll-contain",
          )}>
          <SheetHeader className="pb-2">
            <SheetTitle className="flex items-center gap-2.5 text-lg">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="size-4 text-primary" aria-hidden="true" />
              </div>
              Party Management
            </SheetTitle>
            <SheetDescription className="text-xs leading-relaxed">
              Invite players to join your table remotely. Manage profiles, assign tokens, and
              control turn order.
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 -mx-6 px-6 mt-2">
            <div className="space-y-5 pb-6">
              <InviteLinkSection
                sceneId={sceneId as Id<"scenes">}
                creatorId={creatorId}
                existingInviteCode={inviteCode}
              />

              <Separator className="bg-border/50" />

              <section>
                <header className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight">Party Members</h3>
                    {players.length > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {players.length} player{players.length !== 1 ? "s" : ""}
                        {activeCount > 0 && (
                          <span className="text-amber-600 dark:text-amber-400">
                            {" "}
                            · {activeCount} active
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </header>

                {players.length === 0 ? (
                  <EmptyPlayersState />
                ) : (
                  <div className="space-y-3">
                    {players.map((player, index) => (
                      <div
                        key={player.id}
                        className="animate-in fade-in-0 slide-in-from-right-2"
                        style={{
                          animationDelay: `${index * 50}ms`,
                          animationFillMode: "backwards",
                        }}>
                        <PlayerCard
                          player={player}
                          sceneId={sceneId as Id<"scenes">}
                          creatorId={creatorId}
                          isActive={activePlayerIds.includes(player.id)}
                          tokenTemplates={tokenTemplatesForDisplay}
                          tokenInstances={tokenInstancesForAssignment}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}

export default PlayersSheet;
