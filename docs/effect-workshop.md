# Effect Workshop

The scene HUD now groups navigation/presets, Effects/Tokens, and session controls.
Lights, mirrors, and programmable effects use the same palette, placement step,
selection, and inspector. Player windows keep their existing controls.

## Implementation

- `src/lib/effects/catalog.ts` adapts built-in choices and pinned effect versions.
  The scene still stores `lights`, `mirrors`, and `effects` separately.
- `workshopStore` owns temporary placement, selection, and six recent successful
  choices. Scene-scoped session handoffs preserve tuned values through navigation
  and refresh. Confirmation is guarded against cancellation and repeated clicks.
- `EffectWorkshop` provides Add/In scene, common inspection, and accessible hidden
  or locked objects. Object selection never changes array order. Deletion offers
  a 15-second Undo; restoration is scoped to the original scene.
- The gallery uses paginated server-side search and URL browsing state. The editor
  and gallery share a bounded preview with environments, renderer comparison,
  sample geometry, pause, and restart. The studio is loaded separately from the
  scene bundle and preserves production React Compiler optimization.
- Draft recovery accepts unfinished form values separately from save validation.
  Shader and JavaScript drafts survive kind changes and refresh. Saves create
  explicit versions; remixes retain attribution and start private.
- Thumbnail capture/upload is best-effort and cannot prevent saving. Older
  versions without thumbnails use a placeholder.

## Development rollout

The updated schema/functions were deployed to `ceaseless-pigeon-83` in
`lighting-vtt` with explicit user approval. `effects:prepareWorkshop` completed
the searchable-metadata backfill and seeded the four curated starters. Production
was not deployed. Run the bounded preparation mutation after deploying to another
environment and complete every returned page before relying on indexed search.

Clerk and Convex must use the same development issuer. The signed-in browser
currently receives HTTP 404 for Clerk's `tokens/convex` request. Configure a Clerk
JWT template using the Convex preset, named `convex`, in development app
`current-eagle-79`. Browser sign-in alone does not authenticate Convex mutations.
UploadThing configuration remains on the Convex deployment, with the frontend
pointing at the `.convex.site` host.

## Verification

Run `bun run test:workshop`, `bun run lint`, and `bun run build`.

Verified during implementation:

- 12 behavioral tests, including placement cancellation, tuned handoff scoping,
  six-item recents, pinned duplication, limits, order-preserving selection/Undo,
  interrupted drafts, and WebGPU device-loss handling.
- TypeScript, ESLint, and the production build with React Compiler enabled.
- All four built-ins placed through the palette; keyboard Place at center,
  inspector editing, duplication, and deletion Undo.
- A tuned programmable effect survived refresh before placement; a double-click
  confirmed exactly one instance and preserved the tuned value.
- Hidden/locked effects remained selectable; local player synchronization
  received visibility changes and rendered the effect without authoring controls.
- Indexed search returned effects outside the first result page.
- Studio layouts at 390, 768, 1280, and 1920 pixels; scene drawers at mobile/tablet
  sizes and separate Initiative/Effects panels on desktop.
- Shader previews on WebGL and WebGPU, and JavaScript previews on both backends.
  A WebGPU loss exposed a repeated restore loop, now covered by a regression test.
  Lost WebGPU devices are not reported as restored; Restart builds a fresh preview.
  Preview teardown also releases its owned GPU device. The production preview
  rendered the portal successfully, including Restart on a fresh device with no
  console errors; extended development-browser testing still
  encountered intermittent timeouts, so sustained WebGPU stability across hot
  reloads is not yet signed off. See the [WebGPU device-loss contract](https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/lost).

Still requires authenticated browser verification after the Clerk configuration:
creator saves and thumbnail persistence, explicit version saves, private remix,
publish, scene/preset persistence, and remote authenticated GM/player updates.
Local player-window synchronization is not a substitute for those checks.

An isolated development scene named `Workshop HUD verification (disposable)` was
created under the test identity `workshop-ui-verification`; it uses the local
ignored `.tmp/workshop-test-map.png` fixture. Existing user scenes were untouched.

## Editor assistance

The studio retains CodeMirror with a workshop theme for light and dark modes.
`authoringReference.ts` supplies the Reference panel, API completions, hover
documentation, and helper signature hints. Authored controls update suggestions
immediately: JavaScript uses `input.params.key`; shaders insert the correct
numeric `effectParam` / `effectParamVec` call. Named slots also appear inside
helper calls. JavaScript retains local-name completion.

Ctrl+Space or the Suggest button opens completions; Enter accepts, Escape
dismisses, and Tab moves between snippet fields or out of the editor. Entry-point,
soft-falloff, pulse, and geometry snippets are language-specific. Completion
documentation is positioned outside the list on narrow screens.

This is contract-aware assistance, not a full language service. Shader syntax
still uses approximate Rust/C++ grammars; inferred shader types, arbitrary alias
resolution, and JavaScript semantic type checking are not included. Existing
compiler/runtime diagnostics continue to provide validation.

Seven focused editor tests cover member scoping, replacement ranges, live
parameter schemas, comment/string suppression, language-specific snippets, shared
documentation, and signature hints. Browser checks covered JS property insertion,
WGSL/GLSL snippet expansion, independent snippet fields, keyboard exit, light/dark
themes, and phone-width popup positioning using an isolated temporary fixture.

## Measurement

React components use `usePostHog`. `effect_placement_started`,
`effect_placement_cancelled`, and `effect_placement_completed` support completion
rate; completed events include duration, first-placement status, and time since
scene open. Successful-add events fire after confirmation. `effect_save_started`,
`effect_save_failed`, and `effect_version_saved` support creator save completion.
Template, remix, and publish events describe the creator funnel.
`effect_runtime_observed` records status transitions by renderer and view for
failure-rate analysis without emitting events every frame.

No outcome measurements are claimed yet; these events need real usage data.
