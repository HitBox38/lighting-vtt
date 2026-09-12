# Effect authoring and version releases

## Behavior

With version releases enabled, saving creates an immutable private working version. Releasing selects the exact version shown in the shared release review, updates the public catalog/search metadata and its thumbnail, and records its first release time. Previous releases remain readable while the effect is public. Private working versions remain author-only except for active pins on an author-owned table under the existing scene authorization rules.

Regular publishing uses 10 tokens/hour with a burst of 5. The existing `EFFECT_ADMIN_USER_IDS` allowlist gets 60/hour with a burst of 20. Ownership, hidden status, version existence, and no-op releases are checked before consuming tokens. No delayed automatic publishing or new admin grants are introduced.

## Deployment order

1. Deploy the additive backend/schema with `EFFECT_VERSION_RELEASES_ENABLED` unset. Deploy the frontend that understands release status and review. Until cutover the UI warns that saving public effects still updates the public listing.
2. Run `effects:backfillReleases` as an internal mutation, starting with `{}`. Repeat with `{ "cursor": "<returned cursor>" }` until `done: true`. Each transaction handles at most 50 effects. This copies current public metadata, preserves current public version access through a legacy boundary, and retains the matching generated thumbnail reference. Private and hidden effects are not newly released.
3. Run `effects:backfillVersionReleases` with the same cursor procedure until done. This marks the previously public versions without changing any authored source or controls. The legacy boundary also covers a legacy publication/save racing with this pass.
4. Run `effects:auditReleaseMigration` through every page. All `missing` arrays must be empty. Do not enable the flag if a public effect is missing its projection or latest source version. Repeat the backfill if necessary. Legacy public saves and first publication maintain the new projection, so they do not invalidate a completed pass.
5. Set `EFFECT_VERSION_RELEASES_ENABLED=true` in the intended Convex deployment. Verify the save-v2 / public-v1 / release-v2 flow using disposable development effects before production cutover.
6. Monitor `effect_release_failed` events by `reason` (`cooldown` or `mutation`), and the existing `effect_published` event. Events contain effect IDs/version numbers, never source code. Use backend logs for unexpected failures.

Activation is sticky: the first enabled authoring/release mutation records an `effectReleaseRollout` marker. Removing the environment flag after that does **not** revert to whole-effect access or publish private drafts. Roll forward with fixes; do not roll the backend back to a pre-version-access implementation. Unpublish/hide rules still gate all previously released versions.

The three additional script starters are available immediately in the editor. The existing `effects:prepareWorkshop` routine seeds them as public system presets using the established stable starter keys; run that routine through every returned cursor as part of the normal workshop preparation workflow.

## Hosted development verification — 2026-09-13

Deployed the additive schema and functions to `ceaseless-pigeon-83` (the `lighting-vtt` project's hosted personal development deployment). Both backfills completed and the migration audit returned no missing effects. Enabled `EFFECT_VERSION_RELEASES_ENABLED` and completed `prepareWorkshop` to seed the script starters.

Live CLI smoke checks with a disposable development identity verified private save/public release separation, private source and search exclusion, author access, previous released-version access, duplicate release idempotence, the regular five-release burst, restored cooldown status, and preservation of saved v6/public v5 after the sixth release failed. All disposable effects were unpublished and deleted afterward. Cooldown expiry and curator allowances remain covered by the local component tests; this smoke run did not wait six minutes or modify the admin allowlist.

The generated Convex API types and frontend TypeScript check passed after deployment. Frontend changes remain local; no frontend host or production deployment was updated.

## Local verification commands

- `bun test --tsconfig-override tsconfig.app.json tests`
- `bun run build` (includes TypeScript and the production React Compiler)
- `node_modules/.bin/tsc -p convex/tsconfig.json --noEmit`
- Start Vite locally, then open `/tests/workbench-preview.html`. This fixture uses the production preview, controls, recovery hook, and release-review UI; release transport is explicitly simulated and never contacts production.

The fixture can vary backing-pixel density between 1 and 2, resize the canvas, switch scripts/renderers, exercise account-scoped recovery, and simulate a five-second release cooldown followed by a successful retry. The existing real Convex component tests separately verify publication, authorization, cooldowns, migration, rollback protection, and version-specific thumbnails.

Keep checks for unavailable GPUs explicit: this browser's results are advisory, not a cross-browser certification. A supplied program that fails on an available renderer blocks the review; a missing optional GLSL program is reported as fallback.
