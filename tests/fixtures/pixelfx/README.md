# PixelFX bench fixtures

These are unmodified sprite-sheet exports from [PixelFX](https://github.com/patch-gg/pixelfx)
at commit `a84159688af3ca37a4be05a0d422b94451b2e24e`. The bench uses only these baked
images and their metadata. It does not load the upstream effect code.

Run `node scripts/bake-pixelfx.mjs` from the repository root after
`bun install --frozen-lockfile` to regenerate them. The script verifies the pinned
archive SHA-256 before running its tools, checks the three effects, exports their
sheets, and writes `manifest.json` with per-file hashes. Source archives and fresh
extractions are retained under the ignored `.tmp/pixelfx-bake/` directory; the
script prints each run's contact-sheet location for visual inspection.

The upstream render command is:

```sh
node tools/render.mjs fire/campfire arcane/portal arcane/rune-circle --sheet --no-actor --bg none
```

Keep `LICENSE` and `NOTICE.md` with any copied assets. The excluded gallery font
is not included in these fixtures.

| Sheet | Frame size | Pivot | Frames | Duration from JSON | PNG bytes |
| --- | --- | --- | ---: | ---: | ---: |
| Campfire | 128 × 128 | 64, 112 | 90 | 2,970 ms | 950,044 |
| Portal | 152 × 116 | 76, 106 | 72 | 2,376 ms | 905,574 |
| Rune circle | 136 × 100 | 68, 80 | 120 | 3,960 ms | 1,256,946 |

Each frame has a 33 ms duration in the exported JSON. The metadata also says
30 fps, but 33 ms is rounded from 1000/30; use the frame durations rather than
silently replacing them with a different playback clock.

## Export observations

On Node 24.20.0, two consecutive runs produced identical PNGs, JSON, and manifest
hashes. The upstream checker reported three passes and no warnings. Contact sheets
show standalone art with no actor or backdrop. The portal is upright; the rune
circle is a perspective floor ellipse. Neither is a top-down map shape.

The upstream sheet exporter has a compositing limitation worth preserving in this
experiment: `spriteSheet()` pastes the already composited transparent pixels through
`canvas().paste()`, which multiplies RGB by alpha while keeping that alpha. For
example, the first campfire frame's pixel at (77, 86) is `[255, 191, 97, 100]` in
`renderFrames().frames[0].clear`, but `[100, 75, 38, 100]` in the exported PNG.
This can darken translucent glow when a normal image renderer applies alpha again.
These fixtures retain the exact upstream output; the bake script does not patch
or unpremultiply it. Compare normal and additive blending on both bright and dark
backgrounds before deciding whether this export path suits the table.

Passing the generator's checks is not visual approval. Inspect the bench for loop
motion, readability, framing, and the glow's behavior on each background.
