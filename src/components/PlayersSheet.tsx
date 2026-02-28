import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import {
  Check,
  ClipboardCopy,
  Crown,
  Link2,
  Pencil,
  RefreshCw,
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

interface PlayerCardProps {
  player: ScenePlayer;
  sceneId: Id<"scenes">;
  creatorId: string;
  isActive: boolean;
  tokenTemplates: Array<{ id: string; name: string; imageUrl: string; borderColor: string }>;
  tokenInstances: Array<{ id: string; templateId: string }>;
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

  const assignedTokens = useMemo(() => {
    return player.tokenInstanceIds
      .map((tokenId) => {
        const instance = tokenInstances.find((t) => t.id === tokenId);
        if (!instance) return null;
        const template = tokenTemplates.find((t) => t.id === instance.templateId);
        if (!template) return null;
        return { instanceId: tokenId, template };
      })
      .filter(Boolean) as Array<{
      instanceId: string;
      template: { id: string; name: string; imageUrl: string; borderColor: string };
    }>;
  }, [player.tokenInstanceIds, tokenInstances, tokenTemplates]);

  const unassignedTokenInstances = useMemo(() => {
    const allAssignedIds = new Set<string>();
    return tokenInstances
      .filter((inst) => !allAssignedIds.has(inst.id))
      .map((inst) => {
        const template = tokenTemplates.find((t) => t.id === inst.templateId);
        return template ? { instanceId: inst.id, template } : null;
      })
      .filter(Boolean) as Array<{
      instanceId: string;
      template: { id: string; name: string; imageUrl: string; borderColor: string };
    }>;
  }, [tokenInstances, tokenTemplates]);

  const handleSaveEdit = async () => {
    if (!editPlayerName.trim() || !editCharacterName.trim()) return;
    await updatePlayer({
      sceneId,
      creatorId,
      playerId: player.id,
      playerName: editPlayerName.trim(),
      characterName: editCharacterName.trim(),
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditPlayerName(player.playerName);
    setEditCharacterName(player.characterName);
    setIsEditing(false);
  };

  const handleRemove = async () => {
    await removePlayer({ sceneId, creatorId, playerId: player.id });
  };

  const handleToggleActive = async () => {
    await setPlayerActive({
      sceneId,
      creatorId,
      playerId: player.id,
      active: !isActive,
    });
  };

  const handleAssignToken = async (tokenInstanceId: string) => {
    const nextIds = [...player.tokenInstanceIds, tokenInstanceId];
    await updatePlayer({
      sceneId,
      creatorId,
      playerId: player.id,
      tokenInstanceIds: nextIds,
    });
  };

  const handleUnassignToken = async (tokenInstanceId: string) => {
    const nextIds = player.tokenInstanceIds.filter((id) => id !== tokenInstanceId);
    await updatePlayer({
      sceneId,
      creatorId,
      playerId: player.id,
      tokenInstanceIds: nextIds,
    });
  };

  return (
    <div className="rounded-lg border bg-card p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="space-y-2">
              <div>
                <Label htmlFor={`pn-${player.id}`} className="text-xs text-muted-foreground">
                  Player Name
                </Label>
                <Input
                  id={`pn-${player.id}`}
                  value={editPlayerName}
                  onChange={(e) => setEditPlayerName(e.target.value)}
                  className="h-7 text-sm"
                />
              </div>
              <div>
                <Label htmlFor={`cn-${player.id}`} className="text-xs text-muted-foreground">
                  Character Name
                </Label>
                <Input
                  id={`cn-${player.id}`}
                  value={editCharacterName}
                  onChange={(e) => setEditCharacterName(e.target.value)}
                  className="h-7 text-sm"
                />
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => void handleSaveEdit()}>
                  <Check className="size-3 mr-1" />
                  Save
                </Button>
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={handleCancelEdit}>
                  <X className="size-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium truncate">{player.playerName}</p>
                {player.clerkUserId && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 shrink-0">
                    Registered
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                <Crown className="inline size-3 mr-0.5 -mt-px" />
                {player.characterName}
              </p>
            </>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-0.5 shrink-0">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon-sm"
                    variant={isActive ? "default" : "ghost"}
                    className="size-6"
                    onClick={() => void handleToggleActive()}
                  >
                    <Sword className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {isActive ? "Revoke turn" : "Grant turn (allow token movement)"}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="size-6"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Edit player</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="size-6 text-muted-foreground hover:text-destructive"
                    onClick={() => void handleRemove()}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Remove player</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>

      {isActive && (
        <Badge className="text-[10px]">
          <Sword className="size-3 mr-1" />
          Active Turn
        </Badge>
      )}

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Assigned Tokens</p>
        {assignedTokens.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {assignedTokens.map(({ instanceId, template }) => (
              <div
                key={instanceId}
                className="flex items-center gap-1 rounded-md border bg-muted/50 px-1.5 py-0.5"
              >
                <img
                  src={template.imageUrl}
                  alt={template.name}
                  className="size-4 rounded-full object-cover"
                  style={{ border: `1px solid ${template.borderColor}` }}
                />
                <span className="text-[11px]">{template.name}</span>
                <button
                  className="ml-0.5 text-muted-foreground hover:text-destructive"
                  onClick={() => void handleUnassignToken(instanceId)}
                  aria-label={`Unassign ${template.name}`}
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground italic">No tokens assigned</p>
        )}

        {unassignedTokenInstances.length > 0 && (
          <div className="mt-2">
            <p className="text-[10px] text-muted-foreground mb-1">Assign a token:</p>
            <div className="flex flex-wrap gap-1">
              {unassignedTokenInstances.map(({ instanceId, template }) => (
                <button
                  key={instanceId}
                  className="flex items-center gap-1 rounded-md border border-dashed px-1.5 py-0.5 text-[11px] hover:bg-accent transition-colors"
                  onClick={() => void handleAssignToken(instanceId)}
                >
                  <img
                    src={template.imageUrl}
                    alt={template.name}
                    className="size-4 rounded-full object-cover"
                    style={{ border: `1px solid ${template.borderColor}` }}
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

  const handleGenerateCode = async () => {
    await createInviteCode({ sceneId, creatorId });
  };

  const handleRegenerateCode = async () => {
    await regenerateInviteCode({ sceneId, creatorId });
  };

  const handleCopyLink = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!existingInviteCode) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Generate an invite link so players can join this scene remotely.
        </p>
        <Button size="sm" onClick={() => void handleGenerateCode()}>
          <Link2 className="size-4 mr-2" />
          Generate Invite Link
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">Invite Link</Label>
      <div className="flex items-center gap-2">
        <Input
          readOnly
          value={inviteUrl ?? ""}
          className="h-8 text-xs font-mono"
          onFocus={(e) => e.target.select()}
        />
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon-sm" variant="outline" onClick={() => void handleCopyLink()}>
                {copied ? <Check className="size-3.5" /> : <ClipboardCopy className="size-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{copied ? "Copied!" : "Copy link"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon-sm" variant="outline" onClick={() => void handleRegenerateCode()}>
                <RefreshCw className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Regenerate (invalidates old link)</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

interface PlayersSheetProps {
  sceneId: string;
}

export function PlayersSheet({ sceneId }: PlayersSheetProps) {
  const { user } = useUser();
  const creatorId = user?.id ?? "";

  const scene = useQuery(
    api.scenes.getById,
    sceneId ? { id: sceneId as Id<"scenes"> } : "skip",
  );

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

  const tokenInstancesForAssignment = useMemo(
    () => tokens.map((t) => ({ id: t.id, templateId: t.templateId })),
    [tokens],
  );

  const tokenTemplatesForDisplay = useMemo(
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

  return (
    <Sheet>
      <SheetTrigger asChild>
        <HudSurface className="items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline">
                  <Users className="size-4 mr-2" />
                  Players
                  {players.length > 0 && (
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4">
                      {players.length}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Manage players &amp; invites</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </HudSurface>
      </SheetTrigger>

      <SheetContent side="right" className="flex flex-col w-[400px] sm:max-w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="size-5" />
            Players
          </SheetTitle>
          <SheetDescription>
            Invite players to join this scene remotely. Manage their profiles and token assignments.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-4 px-4">
          <div className="space-y-4 pb-4">
            <InviteLinkSection
              sceneId={sceneId as Id<"scenes">}
              creatorId={creatorId}
              existingInviteCode={inviteCode}
            />

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">
                  Invited Players
                  {players.length > 0 && (
                    <span className="text-muted-foreground ml-1.5">({players.length})</span>
                  )}
                </h3>
              </div>

              {players.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserPlus className="size-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No players yet</p>
                  <p className="text-xs mt-1">
                    Share the invite link to let players join your scene
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {players.map((player) => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      sceneId={sceneId as Id<"scenes">}
                      creatorId={creatorId}
                      isActive={activePlayerIds.includes(player.id)}
                      tokenTemplates={tokenTemplatesForDisplay}
                      tokenInstances={tokenInstancesForAssignment}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export default PlayersSheet;
