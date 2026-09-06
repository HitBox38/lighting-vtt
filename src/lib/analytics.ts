import posthog from "posthog-js";

type EventProperties = Record<string, string | number | boolean | null | undefined>;

export const ANALYTICS_EVENTS = {
  ActivationLandingViewed: "activation_landing_viewed",
  ActivationLibraryViewed: "activation_library_viewed",
  CreateSceneDialogOpened: "create_scene_dialog_opened",
  SceneCreated: "scene_created",
  SceneEditorEntered: "scene_editor_entered",
  SceneLoadFailed: "scene_load_failed",
  SceneLoaded: "scene_loaded",
  SceneAutosaveFailed: "scene_autosave_failed",
  JoinInviteInvalid: "join_invite_invalid",
  JoinDmOffline: "join_dm_offline",
  JoinInviteValid: "join_invite_valid",
  JoinSceneSucceeded: "join_scene_succeeded",
  JoinSceneFailed: "join_scene_failed",
  CreateSceneUploadStarted: "create_scene_upload_started",
  CreateSceneUploadCompleted: "create_scene_upload_completed",
  CreateSceneUploadFailed: "create_scene_upload_failed",
  CreateSceneMutationFailed: "create_scene_mutation_failed",
  PlayersSheetOpened: "players_sheet_opened",
  PlayersInviteGenerated: "players_invite_generated",
  PlayersInviteRegenerated: "players_invite_regenerated",
  PlayersInviteLinkCopied: "players_invite_link_copied",
  PlayersPlayerUpdated: "players_player_updated",
  PlayersPlayerRemoved: "players_player_removed",
  PlayersPlayerActiveToggled: "players_player_active_toggled",
  PlayersTokenAssigned: "players_token_assigned",
  PlayersTokenUnassigned: "players_token_unassigned",
  RemotePlayerTokenMoveSucceeded: "remote_player_token_move_succeeded",
  RemotePlayerTokenMoveFailed: "remote_player_token_move_failed",
  PresetSavedNew: "preset_saved_new",
  PresetUpdatedCurrent: "preset_updated_current",
  PresetLoaded: "preset_loaded",
  PresetRandomized: "preset_randomized",
  PresetDeleted: "preset_deleted",
  LightAdded: "light_added",
  LightRemoved: "light_removed",
  MirrorAdded: "mirror_added",
  MirrorRemoved: "mirror_removed",
  EffectAdded: "effect_added",
  EffectRemoved: "effect_removed",
  EffectVersionChanged: "effect_version_changed",
  EffectEditorOpened: "effect_editor_opened",
  EffectVersionSaved: "effect_version_saved",
  EffectPublished: "effect_published",
  EffectUnpublished: "effect_unpublished",
  EffectReported: "effect_reported",
  EffectLibraryViewed: "effect_library_viewed",
  TokenTemplateCreated: "token_template_created",
  TokenPlacementModeSelected: "token_placement_mode_selected",
  TokenInstancePlaced: "token_instance_placed",
  InitiativeValueSet: "initiative_value_set",
  InitiativeValueCleared: "initiative_value_cleared",
  InitiativeRolled: "initiative_rolled",
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type SceneEntrySource = "create" | "join" | "library" | "direct_or_library";
export type CountBucket = "0" | "1-3" | "4+";

const SCENE_ENTRY_SOURCE_KEY = "lighting-vtt:scene-entry-source";

const isPostHogLoaded = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const candidate = posthog as unknown as { __loaded?: boolean; capture?: unknown };
  return Boolean(candidate.__loaded) && typeof candidate.capture === "function";
};

export const capture = (event: AnalyticsEventName, properties?: EventProperties) => {
  if (!isPostHogLoaded()) {
    return;
  }
  posthog.capture(event, properties);
};

export const setSceneEntrySource = (source: SceneEntrySource) => {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem(SCENE_ENTRY_SOURCE_KEY, source);
};

export const consumeSceneEntrySource = (): SceneEntrySource | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const source = window.sessionStorage.getItem(SCENE_ENTRY_SOURCE_KEY);
  if (!source) {
    return null;
  }

  window.sessionStorage.removeItem(SCENE_ENTRY_SOURCE_KEY);
  if (source === "create" || source === "join" || source === "library" || source === "direct_or_library") {
    return source;
  }
  return null;
};

export const toCountBucket = (count: number): CountBucket => {
  if (count <= 0) {
    return "0";
  }
  if (count <= 3) {
    return "1-3";
  }
  return "4+";
};
