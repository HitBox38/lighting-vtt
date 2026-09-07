# Lighting VTT icon concepts

Three original, hand-authored vector directions, prepared September 7, 2026. Open [the comparison sheet](comparison.svg) to compare color and monochrome versions on light and dark backgrounds, including actual 16, 24, 32, 48, and 128 px samples. View the sheet at its intrinsic size for the pixel-size comparison; zooming scales the samples.

| Concept | Color SVG | Monochrome SVG | Design rationale |
| --- | --- | --- | --- |
| Lightling | [Master](lightling.svg) | [Mono](lightling-mono.svg) | A mischievous flame spirit connects illumination with fantasy adventure. The asymmetric tail and eye cutouts give it a recognizable personality. |
| Revealed Table | [Master](revealed-table.svg) | [Mono](revealed-table-mono.svg) | A rounded diamond tabletop contains a light source and an illuminated wedge. Transparent tile seams suggest map exploration; the monochrome adaptation adds transparent cone boundaries to preserve that meaning. |
| Lightbend | [Master](lightbend.svg) | [Mono](lightbend-mono.svg) | A descending beam turns at a diamond prism and widens into a cone, forming an abstract L. It links Lighting's initial with directional illumination and reflections. |

**Recommendation:** With all three in the same amber-and-coral palette, Lightling remains the best overall fit for the brief: its flame ties directly to Lighting, its character adds fun, and its compact silhouette reads most clearly at favicon size. Revealed Table is the runner-up and communicates map illumination most explicitly, but its internal seams become busier at 16 px. Lightbend is the most geometric option; its connection to tabletop adventure is less immediate.

## Reference notes

The references below were reviewed on their official websites, including visual inspection. These observations informed the design approach; none of their artwork is included in these assets.

- [Owlbear Rodeo](https://www.owlbear.rodeo/): a playful character badge, with a hat motif that reinforces its name. Takeaway: a character can carry both recognition and tone.
- [Foundry VTT's brand guidelines](https://foundryvtt.com/article/branding/): the community example combines an anvil with a die. Takeaway: combine a name-related symbol with a tabletop cue. The page is dated July 3, 2022 and was still served when reviewed.
- [Roll20](https://roll20.net/): a die-based mark accompanied by prominent magenta accents. Takeaway: clear category imagery and consistent color can create a readily spotted identity.
- [Alchemy RPG](https://alchemyrpg.com/): an angular gold A with a sweeping diagonal. Takeaway: a custom initial can feel at home in fantasy while remaining compact.

These are design interpretations, not measured claims about brand recognition. Lighting VTT's implemented lighting, map, fog, and reflection features supplied the product cues.

## Palette and use

All three concepts now share Lightling's amber, coral, and charcoal palette. Revealed Table uses coral for the map and amber for illumination; Lightbend uses amber for the beam and coral for the prism.

| Concept | Main accent | Secondary accent | Suggested dark backdrop |
| --- | --- | --- | --- |
| Lightling | `#FFB547` | `#FF704D` | `#17171C` |
| Revealed Table | `#FFB547` | `#FF704D` | `#17171C` |
| Lightbend | `#FFB547` | `#FF704D` | `#17171C` |

- All six masters have a transparent background and a `0 0 128 128` viewBox. Suggested backdrops are presentation colors, not baked into the icons.
- Prefer the color versions on dark backgrounds. Their pale highlights have less contrast on white; use dark monochrome for small icons on light surfaces. Lightling's eyes are actual transparent holes, so they take the background color.
- Monochrome masters use `currentColor`. Inline SVG inherits CSS text color; SVG loaded through an `<img>` or used as a favicon does **not** inherit the host page's text color. It defaults to black unless a color is set inside the SVG.
- When embedding a master multiple times inline, prefix its IDs and references per instance. The comparison sheet already does this. Separate image files have isolated IDs.
- The icons contain no text, gradients, filters, scripts, embedded raster imagery, or external assets. The comparison sheet uses a local system font stack for its editable labels; label typography may vary slightly across systems.

## Verification

- All seven SVG files parsed successfully as XML; internal IDs are unique and clip/mask references resolve.
- Each of the six masters rendered independently at 16, 24, 32, 48, and 128 px: 30 successful renders. All masters have transparent canvas margins at 128 px.
- Visually inspected the entire comparison sheet, both themes, all five sample sizes, and enlarged pixel samples. Lightling's eye angles were refined after the first render and checked again.
- At 16 px, Revealed Table's fine cone boundaries and Lightbend's prism are necessarily less distinct than in larger samples; their primary silhouettes remain visible. Lightling is the strongest favicon candidate.
- Verification used SVG rasterization with Sharp/librsvg, not a browser compatibility suite. Raster previews are inspection artifacts; the deliverables remain SVG.

## Selected icon

Lightling was selected as the app icon. Its amber-and-coral master is installed at `public/lightling.svg` and used by the favicon, landing header, library header, and library sign-in state. The other concepts and this comparison sheet remain available as design exploration records.
