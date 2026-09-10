# Analytics schema v2

Prepared on 2026-09-10 from `pre-prod` at `8fa6963`, for PostHog EU project **Lighting-VTT / 145897**. Application deployment is not part of this change. New-event charts explicitly await deployment and sufficient observations; an empty chart is not evidence that a feature is unused.

## Reports

| Dashboard | Link | Default |
| --- | --- | --- |
| Activation & Return | https://eu.posthog.com/project/145897/dashboard/582231 | 30 days, with an explicit eight-week retention insight |
| Workshop & Effects | https://eu.posthog.com/project/145897/dashboard/945151 | 30 days |
| Player Experience | https://eu.posthog.com/project/145897/dashboard/945152 | 30 days |
| Reliability & Data Quality | https://eu.posthog.com/project/145897/dashboard/945153 | 30 days |

The existing dashboard was repurposed, preserving acquisition reporting. Its starter three-pageview funnel remains saved but is detached from headline reporting. No historical events were deleted. Every saved query was executed through the PostHog plugin before saving. The exact queries and IDs are in [posthog-reporting.json](./posthog-reporting.json).

Project timezone is **Asia/Jerusalem**. Production queries use the verified `lighting-vtt.xyz` host so useful pre-v2 acquisition data remains visible. New events also carry an explicit environment label. SQL insights include `{filters}` for dashboard property/cohort filters and have a bounded 30-day scan. To inspect a longer SQL period, update the SQL bound as well as the date selector. All dashboard defaults are saved as 30 days. The retention tile has an explicit eight-week date override and still inherits dashboard cohort filters.

Internal production use is included. To exclude it, add a dashboard **Cohort → Internal users → is not** filter. [Internal users](https://eu.posthog.com/project/145897/cohorts/236648) is a static, verified-empty cohort. PostHog's UI disallows creating an empty manual selection, so it was initialized from an executed zero-result snapshot; it does not update from that criterion. Only manually add profiles after verifying their identified Clerk ID and internal status. No identity was inferred from anonymous IDs, IP addresses, or localhost use.

Reusable production audiences:

| Audience | Action | Cohort |
| --- | --- | --- |
| Engaged DMs | 157027 | https://eu.posthog.com/project/145897/cohorts/236653 |
| Effect creators | 157028 | https://eu.posthog.com/project/145897/cohorts/236656 |
| Remote players | 157029 | https://eu.posthog.com/project/145897/cohorts/236661 |

## Event contract

[event-inventory.json](./event-inventory.json) lists every event and its keep/change/add/retire decision. React code uses `usePostHog`; store subscribers use the small consent-gated `capture` helper. Names are consolidated in `analytics.ts`; allowed product property names/types and shared context live in `analyticsContext.ts`. The SDK transport's public project `token`, `distinct_id`, and `$` metadata remain intact.

Every event receives `analytics_schema_version=2`, `environment`, `release`, and normalized `page_type`. Relevant scene events also receive an opaque `scene_id`, effective `role` (`gm`, `player`, `remote_player`) and `scene_visit_id`. Roles follow actual scene ownership/access, not a requested URL mode. Scene IDs and attempt IDs are correlation keys, never credentials.

| Family | Decision and semantics | Useful properties |
| --- | --- | --- |
| `$pageview`, `activation_*_viewed`, `effect_library_viewed` | Capture the current view on late acceptance; deduplicate effect replay. Semantic page navigation ignores search typing, handoff cleanup and incidental hashes. | `page_type`, `signed_in`, `from_scene` where applicable |
| `create_scene_dialog_opened`, `scene_create_started`, `scene_created`, `create_scene_mutation_failed` | Both dialog entry paths use the same handler. Creation success follows the mutation. | `attempt_id`, `has_map_upload`, resulting `scene_id`, `role`, bounded failure category |
| `scene_loaded`, `scene_load_failed`, `scene_editor_entered` | Data availability/entry, distinct from rendering readiness. | scene context, `entry_source`, `is_remote_player`, `reason` |
| `scene_canvas_ready`, `scene_canvas_failed` | Renderer initialized and map texture loaded; map-load failure or a labeled 30-second renderer initialization timeout. Timeout is an observation, not proof of an exception. | scene context, `error_category` |
| `scene_edit_persisted`, `scene_autosave_failed`, `scene_autosave_recovered` | First successful changed-state save per visit, and failure/recovery transitions. Identical repeated failures are suppressed. Old-visit mutation responses cannot mark a new visit saved. | scene context, `error_category` |
| `preset_saved_new`, `preset_updated_current`, `preset_deleted`, `preset_mutation_failed` | Success after mutation completion; failure separately. Preset load/randomize and their useful context remain. | `scene_id`, `role`, `operation`, `preset_count_bucket`, `via` |
| `asset_upload_started/completed/failed` | Shared map/token/thumbnail lifecycle; one terminal event per attempted upload, including preparation and transport failures. | `attempt_id`, `purpose`, `duration_ms`, `original_bytes`, `uploaded_bytes`, `compression_outcome`, `error_category` |
| `effect_placement_started/completed/cancelled/failed` | Canonical placement lifecycle from gallery handoff or palette. Replacement, other controls, cancellation and scene exit terminate the current attempt. Retry creates a new ID. | `attempt_id`, scene context, `source`, object `kind`, `light_type`, programmable `effect_kind`, effect/version IDs, duration, `first_in_scene` |
| `effect_detail_viewed`, `effect_editor_opened`, `effect_remix_started`, `effect_template_selected`, `effect_editor_status_changed` | Loaded detail views, authoring entry and settled status changes. Ignore transient/repeated compile status; never send diagnostic text. | `effect_id`, `version`, `effect_kind`, `mode`, `template`, `status`, `blocker`, `backend` |
| `effect_save_started`, `effect_version_saved`, `effect_save_failed`, `effect_publish_started`, `effect_published`, `effect_publish_failed` | Mutation outcomes, with publishing measured from editor and detail surfaces. | `attempt_id`, `effect_id`, `version`, `effect_kind`, `mode=new/edit/remix`, `error_category` |
| `player_view_open_requested` | Request to open the separate player window; actual readiness uses `scene_canvas_ready` with `role=player`. | scene context |
| `join_invite_valid/invalid`, `join_dm_offline`, `join_scene_started/succeeded/failed` | Settled invite availability and submitted join operations. No invite capability or character/player name. | scene context when valid, `attempt_id`, event-time `auth_type=guest/account`, `already_joined`, `error_category` |
| `remote_player_token_move_succeeded/failed` | Exactly one outcome per submitted mutation; success throttling removed. No coordinates or token names. | `attempt_id`, `scene_id`, `role`, `error_category` |
| `effect_runtime_observed` | Settled transitions deduplicated by scene, instance, version, backend and status. No frames or repeated identical errors. `ok` is the successful runtime status. | scene/effect/instance/version IDs, `effect_kind`, `backend`, `status`, `view` |
| Preset load, token, initiative, invitation, object-removal, unpublish and report events | Preserve useful existing events with shared context/privacy protection. DM invite activity remains separate from player conversion. | Existing bounded properties plus scene context |
| `light_added`, `mirror_added`, `effect_added` | Retired emitters; use enriched `effect_placement_completed`. | Historical data retained |
| `create_scene_upload_started/completed/failed` | Retired emitters; use `asset_upload_*` with `purpose=map`. | Historical data retained |

**`first_in_scene` means the current scene visit, not the scene's lifetime.** A reload or new visit starts a new visit count. Gallery handoffs carry only bounded analytics metadata plus the existing functional handoff. An unmeasured handoff is not retroactively turned into a measured click after consent; a subsequent placement submission may start a new measured attempt.

Five existing replaced definitions were tagged deprecated in PostHog. `create_scene_upload_failed` had no taxonomy definition to update; it remains retired in this inventory. New definitions must not be marked verified until deployed events have been checked.

## Metric interpretation

- An **engaged DM** places an object, loads a preset, places a token or rolls initiative with effective `gm` role. Weekly engagement and retention use the same Jerusalem calendar-week boundary.
- Activation and authoring funnels have seven-day windows. Scene preparation is correlated by person and scene ID. Discovery and joining use 30-minute windows; joining is correlated by person and scene ID. The authoring funnel describes user adoption across authoring activity, not one effect's immutable history.
- Placement, upload and join success rates use matched unique person/attempt outcomes. Unresolved attempts are separate. Cancellation is a placement terminal outcome. Movement rates use v2 terminal attempt IDs, excluding historical throttled successes. Zero denominators produce null rates.
- Canvas readiness and player-view opening are observable milestones; neither proves a tabletop session occurred. DM invitation generation/copying is not a player-conversion funnel step.
- Event-time `auth_type` describes account/guest joining. Historical anonymous acquisition is not reported as verified identified-account activity; no account identities were backfilled.
- Web vitals report P90 and each metric's own sample count. CLS is unitless, separate from LCP/FCP/INP milliseconds. DOM heatmaps cover landing CTAs, discovery and navigation, not Pixi canvas interactions.

## Consent, replay and privacy

No PostHog initialization/storage/requests before consent. Localhost capture is disabled unless the explicit `VITE_ANALYTICS_DEBUG=true` override is set. Preview traffic is labeled separately. Never use that override for ordinary development.

Consenting authenticated accounts are identified by Clerk ID only. Logout/account changes reset SDK identity and restore shared properties. Async operations cannot emit outcomes across consent withdrawal/reacceptance or identity changes. View effects measure the currently visible resource on late acceptance without replaying earlier actions.

Analytics URLs retain campaign parameters but remove searches, nested return URLs, guest player IDs, placement parameters, hashes and invite capabilities. Uploaded-file and blob/data URLs are removed. Product events use a property allowlist and bounded errors. Error tracking keeps stack locations for symbolication while removing raw diagnostic messages, locals and source snippets.

Replay remains consent-gated and deferred. Inputs, names/content surfaces and sensitive text attributes are masked; code-editor content is blocked. Raw console logs are disabled in both client configuration and the PostHog project. Request headers/bodies and canvas recording were verified disabled in project settings as well. Canvas recording remains disabled. Existing retention is unchanged. Review a real preview recording to validate masks after deployment; ordinary DOM masking does not protect canvas contents if recording is enabled later.

## Feedback

Survey: `01a08b97-8d55-0000-7567-95d6f150d52b`, **Lighting VTT feedback**, type API. Questions: “What were you trying to do?” and optional “What could work better?” The API-only survey is active. It remains programmatic, without automatic display targeting; Library display and response ingestion were verified in the local analytics-enabled preview; DM/editor surfaces remain on the release checklist.

Feedback buttons are in the scene library, DM controls and effect editor. They wait for survey readiness, attach surface/role/release context, and invoke `displaySurvey` on a click. The contact email is used when consent/analytics/survey availability is missing; an eight-second loading fallback avoids an indefinitely disabled button. Responses are intentional free text and are exempt from product-property filtering.

## Build configuration

| Variable | Location/purpose |
| --- | --- |
| `VITE_PUBLIC_POSTHOG_KEY`, `VITE_PUBLIC_POSTHOG_HOST` | Existing public browser project configuration; EU project 145897 |
| `VERCEL_ENV` / `VITE_APP_ENV` | Environment label; localhost remains development even with a production override |
| `VERCEL_GIT_COMMIT_SHA` / `VITE_APP_RELEASE` | Release commit/version; set a real commit for preview/production validation |
| `VITE_ANALYTICS_DEBUG=true` | Explicit temporary localhost instrumentation testing only |
| `POSTHOG_CLI_API_KEY` | **Build-only secret**, never a `VITE_` variable. Must authorize source-map upload to project 145897 |

`bun run build` runs TypeScript, Vite (with React Compiler and existing chunk optimization), then the PostHog source-map step. Maps are hidden, injected/uploaded with release metadata when the build-only credential exists, then removed from deployment artifacts. Upload failures fail the build. Without a credential, the build warns and still removes maps; symbolication is not considered complete. CLI host/project are fixed to EU/145897. Do not deploy using a raw `vite build` command that bypasses cleanup.

No Convex schema migration or server-side product-event pipeline is required. Experiments and gameplay flags remain deferred until meaningful production evidence supports a hypothesis.

## Release validation checklist

Completed locally: **159 Bun tests pass (996 assertions, 29 files)**, TypeScript/lint checks, production build with compiler enabled, no source maps left in `dist`, library rendering/contact fallback, both scene-dialog entry paths, and absence of optional PostHog scripts with local analytics disabled. A separate local analytics-enabled preview verified the library feedback submission and consent withdrawal fallback. The new isolated persistence fixture verifies failure/recovery, mutation completion, visit boundaries and pre-consent saves. Placement tests verify cancellation/replacement, failure/retry and attempt IDs. Consent/privacy tests include the installed SDK capture/flags transport.

Before calling the instrumentation release verified:

- [ ] Build a preview with a real release commit and build-only PostHog credential. Verify source-map upload succeeds, maps are removed, and a controlled error resolves to the correct source line/release in PostHog. Tailwind currently warns that its CSS transformation lacks a map; JavaScript symbolication still needs direct verification.
- [x] Validate the library API-only survey after late consent, optional question, response ingestion and surface/release context; check contact fallback after withdrawal.
- [ ] Repeat feedback display/context validation from DM controls and the effect editor in the deployment preview.
- [ ] Exercise a full scene creation/save through each entry path, map/token/thumbnail compression and upload failure, map/renderer failure, and autosave recovery in an authenticated preview. Check one event per logical outcome and no names/files/coordinates in payloads.
- [ ] Exercise palette/gallery placement, handoff, replacement, Escape/other-controls cancellation, failure/retry, and scene exit. Check matching attempt IDs and visit-scoped first placement.
- [ ] Exercise shader/script new/edit/remix saves and both publishing surfaces, including failures. Verify repeated identical runtime/compile errors do not increase event volume.
- [ ] Exercise guest and account joining, invalid/offline invites, one move success/failure per submission, separate TV/player readiness, and mobile controls. Keep inviter and player metrics separate.
- [ ] Inspect a consented replay for masked names, blocked code, disabled canvas/console/body/header capture, and invite redaction. Existing recordings do not prove the new privacy configuration.
- [ ] Verify required-property coverage and production/preview separation in live v2 events. Add only verified internal Clerk profiles to the static Internal users cohort and verify their membership. The empty Internal users inclusion filter was applied successfully to Reliability reporting, then cleared; inclusive defaults remain saved.
- [ ] Add the actual deployment annotation with release commit/time, then mark validated event definitions verified. Keep the “awaiting v2” labels until enough data exists; never reinterpret missing instrumentation as feature non-use.

This checklist deliberately distinguishes local automated verification from live preview/source-map/survey validation. No application deployment or live test scene/upload was performed by this change.

## Replay searches and validation notes

The current PostHog UI stores reusable replay searches under **Recordings → Show filters → Saved filters**. Created and verified:

- Failed preparation · production · 30 days (action 157032)
- Failed placement · production · 30 days (action 157033)
- Join problems · production · 30 days (action 157034)

These include internal production use and currently retain PostHog’s default **more than five active seconds** threshold; very short failed sessions may not appear. All three currently have no matching recordings. The [Analytics v2 release validation collection](https://eu.posthog.com/project/145897/replay/playlists/evfwSH7V) is empty and available for manually pinning verified clips.

The API-only feedback survey was activated on 2026-09-10 without automatic popover targeting. After dependency optimization completed, local validation verified late consent, library survey rendering, required first question, optional second question, one received test response with surface/release context, Clerk-only identification, development labeling, and contact fallback after withdrawal. The deliberately labeled test response remains in PostHog. Production build browser checks used analytics-disabled localhost.

During validation the generic `dev` script briefly synchronized the existing Convex **development** functions before it was stopped and replaced with `dev:frontend`. No Convex source changes or production deployment were made; generated line-ending-only rewrites were restored.
