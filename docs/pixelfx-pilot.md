# PixelFX baked-animation pilot

## Decision after grilling

The user approved experimenting with a few baked animations and borrowing PixelFX's visual authoring workflow. They then requested [grill-with-docs](https://github.com/mattpocock/skills/blob/main/skills/engineering/grill-with-docs/SKILL.md) against Codex and Grok. Its `grilling` and `domain-modeling` dependencies guided the questions and documentation. Both respondents settled on an isolated Pixi bench, following the repository's existing `tests/*-preview.html` fixtures. The first proposal, putting sheets straight into the scene effects system, assumed too much product integration before establishing visual fit.

This is an experiment, not an architecture commitment. No ADR is warranted for a bench that is easy to remove. Whether baked animations eventually become an effect kind or another placeable remains open.

### Resolved design frontier

| Question | Grok's challenge | Codex's resolution |
| --- | --- | --- |
| Where does the pilot live? | Scene placement requires real version pins, resolution, editor changes, and a sprite lifecycle. | An isolated development bench. No scene, catalog, editor, persistence, or multiplayer changes. |
| What are we evaluating? | Dark-gallery glow may look like a sticker on a bright map. | Show identical frames on dark stone and light parchment; normal blend is the primary readability test, additive is diagnostic. |
| Which assets? | Broad categories hide perspective assumptions and expensive full-screen animations. | Exactly `fire/campfire`, `arcane/portal`, and `arcane/rune-circle`: three loops exposing a prop, an upright portal, and a perspective floor ring. |
| How are they supplied? | A dependency on a moving repository would undermine a reproducible pilot. | Commit transparent PNG/JSON pairs, exact source revision, file hashes, and upstream license/notice. Regenerate from a verified source archive. |
| How do they play? | A centered square radius would stretch nonsquare frames and misplace their bases. | Honor frame rectangles, per-frame durations, original aspect ratio, and the exported pixel pivot. Nearest sampling at integer scales, with a pivot/bounds overlay. |
| When do we stop? | A failed visual test must not turn into production integration by inertia. | Finish with evidence and an explicit visual evaluation checklist. Unsuitable assets remain rejected or need an authoring iteration; no scene integration is implied. |

Codex challenged two overreaches in Grok's recommendations. Additive compositing can lose contrast against a near-white surface by its nature, so passing every background in both blend modes is not a sound acceptance rule. Also, the current shader/script schema describes today's implementation; it does not decide the architecture of a future sprite feature.

## Source and regeneration

Source: [patch-gg/pixelfx](https://github.com/patch-gg/pixelfx), revision `a84159688af3ca37a4be05a0d422b94451b2e24e` (0.3.0).

```sh
bun install --frozen-lockfile
bun run bake:pixelfx
```

The script downloads a pinned, checksum-verified archive to ignored `.tmp/`, runs upstream checks and rendering, and copies only the three transparent atlases, their JSON, provenance manifest, and license files into `tests/fixtures/pixelfx/`. It does not install PixelFX or ship its rasterizer. Normal testing and viewing use the committed files without contacting upstream.

Exact upstream rendering arguments:

```sh
node tools/render.mjs fire/campfire arcane/portal arcane/rune-circle --sheet --no-actor --bg none
```

The gallery font is excluded. Keep `tests/fixtures/pixelfx/LICENSE` and `NOTICE.md` with derived assets if they are redistributed.

## Run the bench

```sh
bun run dev:pixelfx
```

Open `/tests/pixelfx-preview.html` on the local Vite server. This entry is outside the production application build and does not initialize auth, analytics, or a backend. The sheet loads only when selected; both plates share its decoded source and playback clock. They use separate renderer contexts, so the GPU holds a texture copy per canvas; the displayed RGBA8 estimate is per renderer, not the combined memory of all visited sheets. The renderer defaults to WebGL; choose WebGPU in the bench to evaluate it where supported. Keep the canvas at its native display size; the scrollable plates deliberately preserve integer pixels at larger scales.

## Visual evaluation

Synthetic plates establish compositing and pixel-scale behavior. They do not establish compatibility with real campaign battlemaps, lighting, or fog.

1. In normal blend at 1×, 2×, and 4×, inspect whether each object reads clearly on both plates. Look for grey halos, dim glow, clipping, and distracting pixel density.
2. Toggle the pivot and bounds. The base should stay anchored as frames change and a nonsquare portal must retain its proportions.
3. Pause and scrub consecutive frames, then inspect the last-to-first transition in motion. Confirm there is no stock character or backdrop in the atlas.
4. Compare additive mode. Record where it helps and where it washes out. Additive failure alone is not a rejection if normal blending works for the intended map.
5. Inspect the upright portal and flattened floor ellipse against a top-down tabletop viewpoint. A readable effect can still have unsuitable perspective.
6. Review atlas dimensions and the displayed uncompressed RGBA8 estimate before proposing many simultaneous assets.

Do not claim these assets are visually approved until a human has inspected the live bench on target displays and representative maps. Offline image inspection and structural checks are useful evidence, not that approval.

## Borrowed authoring workflow

For a future variation, work in a separate PixelFX source folder at the pinned revision. Keep a one-line art brief, render the closest existing effect, inspect its contact sheet and motion, fix the weakest visual issue, and repeat. Use `node tools/check.mjs <id>` for bounds, seams, palettes, and seeded output. Keep an accepted variant's source/options and update the bake recipe and hashes deliberately; never replace an existing fixture with an unrecorded manual edit.

The relevant source contract is [AUTHORING.md](https://github.com/patch-gg/pixelfx/blob/a84159688af3ca37a4be05a0d422b94451b2e24e/docs/AUTHORING.md). PixelFX's color and light buffers are flattened during export. The resulting alpha glow does not illuminate the tabletop, reveal darkness, or participate in reflections.

At this revision the sheet exporter also multiplies RGB by alpha while retaining alpha, so a normal image renderer may darken soft glow again. The [fixture observations](../tests/fixtures/pixelfx/README.md) include a measured pixel example. This pilot preserves the exact upstream output rather than silently correcting the exporter.

## Why scene placement waits

`shared/effects.ts` currently defines shader/script programs. New instance pins are authorized against real effect/version rows in `convex/lib/effectInstances.ts`; `useEffectManager` and `useEffectDefinitions` resolve through Convex. `EffectLayer` has no atlas playback path, and `LightingLayer/drawEffects.ts` falls back to circle coverage for an unresolved definition. A separate sprite drawn beside an unresolved instance could therefore reveal an unintended circle. Inspectors also expect authored metadata and version lists. A later production proposal needs to address those contracts explicitly, along with asset ownership, texture cleanup, visibility, ordering, playback timing, and pixel-scale sizing.

## Verification evidence (2026-11-03)

- Two source bakes produced identical bytes; all three upstream checks passed without warnings.
- `bun run test:pixelfx`: seven tests covering timing, loop boundaries, pixel pivots, unsupported atlas shapes, asset hashes, dimensions, and transparency.
- `bun run typecheck:pixelfx`, `bun run lint`, and `bun run build:pixelfx` check the development entry independently of the production application. The bench build includes all six atlas files and license/notice links.
- Headless Edge with software WebGL loaded and rendered each sheet on both plates; pause/scrub, 4× scale, additive selection, restart, and reduced-motion startup worked with no runtime exceptions or failed requests. Desktop and narrow-layout captures were inspected.
- WebGPU was unavailable in that environment. The bench displayed the failure honestly, and its renderer selector successfully recovered to WebGL. Actual WebGPU rendering remains unverified.
- Captured normal-blend frames show a dark halo around the upright portal on the light plate. Campfire remains readable on both plates, with side-view logs. These are provisional observations, not acceptance on real maps or target displays.
