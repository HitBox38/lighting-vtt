# Color contrast audit — September 10, 2026

Reviewed the six page implementations and shared UI in both supported themes: light and dark. The findings below record the original audit. All nine groups have since been addressed in application code; see the remediation results at the end.

## Method and coverage

Compared authored foreground/background colors using the WCAG relative-luminance formula. Converted OKLCH colors from the installed Tailwind palette and app tokens to sRGB, clipping out-of-gamut channels; composited translucent foregrounds/backgrounds before calculating contrast. Ratios below are approximate and rounded for display. They describe the stated surfaces, not every possible image behind translucent scene controls.

WCAG AA requires [4.5:1 for normal text, 3:1 for large text](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), and [3:1 for necessary control/state indicators](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). Disabled controls and redundant/decorative icons are excluded from confirmed text failures.

The local application failed before rendering because `VITE_CONVEX_URL` is missing. A temporary isolated page using the actual project CSS and DiagnosticsPanel, Input, and Switch components corroborated representative light/dark failures visually. Other samples reproduced source class combinations. This was not an authenticated end-to-end audit; Clerk dialogs, live scene imagery, server-driven content, and every transient state remain unverified. Temporary preview files were removed afterward.

| Page | Coverage and findings |
| --- | --- |
| Landing `/` | Both CSS palettes and responsive rules; example caption fails in both themes on desktop. |
| Scene library `/library` | Page, cards, toolbar, create dialog, and shared controls; player-name metadata fails in both themes. |
| Scene `/scene` | Loading/error states and shared HUD, player sheet, effect menus; light-mode invisible copy and status failures; player metadata fails in both. |
| Join `/join/:inviteCode` | Join, invalid-invite, offline, and loading components; no additional text-color failure found in authored page-specific colors; shared input/focus concerns apply. |
| Effect library `/effects` | Cards, detail, report/moderation UI; light-mode fallback and compile-error text fail. |
| Effect editor `/effects/new`, `/effects/:effectId` | Diagnostics, recovery statuses, tabs, parameters, code palette; light-mode status failures; badge and selected-code failures in both themes. |

## Original findings

### 1. High: scene loading and recovery copy disappears in light mode

- `src/pages/ScenePage/ScenePage.tsx:32` and `:40`: `text-white` sits directly on the white body background. “Loading scene...” and “Sign in with a joined account…” have **1.00:1** contrast.
- `src/pages/ScenePage/ScenePage.tsx:41`: the 16px “Scene unavailable” text uses `text-red-500`, approximately **3.82:1** on white.
- Fix direction: use `text-foreground` for the copy and the semantic error color for the heading, on an explicit themed surface.

### 2. Medium: editor diagnostics are too bright in light mode

- `src/pages/EffectEditorPage/components/DiagnosticsPanel/DiagnosticsPanel.tsx:76` and `:109`: successful compile/script text uses `text-emerald-400`, **1.93:1** on white.
- Same file `:88`: the missing-program explanation uses `text-amber-400`, **1.72:1** on white.
- Fix direction: darker success/warning colors in light mode, preserving current bright colors in dark mode. For example, amber-700 passes on white at about **5.05:1**; amber-600 does not.

### 3. Medium: additional scene/status labels fail in light mode

- `src/components/atoms/SaveStatusIndicator/SaveStatusIndicator.tsx:25`: “Saved” uses `text-green-500`, **2.22:1** against a white HUD surface. The HUD is translucent, so actual contrast varies with the map underneath.
- `src/components/molecules/EffectContextMenu/EffectContextMenu.tsx:43`: success status text uses emerald-500, **2.46:1** on the light popover.
- Same file `:44`: warning text uses amber-500, **2.14:1**.
- `src/components/organisms/PlayersSheet/components/PartyMembersSection/PartyMembersSection.tsx:40`: active-player text uses amber-600, **3.19:1** on white.
- `src/components/organisms/PlayersSheet/components/PlayersSheetTrigger/PlayersSheetTrigger.tsx:35`: the active count uses amber-600 on translucent amber. This reduces contrast further, to approximately **2.5–2.7:1** over light surfaces.
- `src/components/organisms/PlayersSheet/components/PlayerCard/components/PlayerIdentity/PlayerIdentity.tsx:19`: the “Verified” badge uses emerald-600 on emerald-500/5, approximately **3.50:1** over a white card.
- Fix direction: introduce consistent theme-aware success/warning foregrounds and check their tinted surfaces, not just white.

### 4. Medium: reduced-opacity player metadata fails in both themes

- `src/pages/LibraryPage/components/PlayerBookmarkCard/PlayerBookmarkCard.tsx:41`: `text-muted-foreground/60` for the player name is **2.31:1 light / 3.27:1 dark** on the card colors.
- `src/components/organisms/PlayersSheet/components/PlayerCard/components/TokenAssignment/TokenAssignment.tsx:56`: “No tokens assigned” uses `text-muted-foreground/70`, **2.74:1 light / 3.97:1 dark** on standard cards. Active-card gradients can change the exact ratio.
- Fix direction: remove the additional opacity. Full-opacity muted text passes on the standard card backgrounds.

### 5. Medium: landing-page example caption fails in both themes

- `src/pages/LandingPage/landing.css:214`: `.landing-example` lowers already-muted text to 75% opacity against `--lp-panel`: **2.93:1 light / 4.44:1 dark**.
- Used by `src/pages/LandingPage/components/ProductShowcase.tsx:33` for “/ EXAMPLE ENCOUNTER” at 10px.
- The caption is hidden at widths of 1000px and below; the failure applies when visible on desktop.
- Fix direction: remove the opacity or choose a stronger caption color.

### 6. Medium: effect-library warning and error copy fail in light mode

- `src/pages/EffectLibraryPage/components/EffectDetail/EffectDetail.tsx:117`: fallback explanation is amber-600 on white, **3.19:1**.
- Same file `:123`: destructive text on destructive/10 measures approximately **3.99:1**; the diagnostic message at `:127` adds opacity-90 and drops to approximately **3.80:1**.
- The related local-recovery warning at `src/pages/EffectEditorPage/components/EffectEditor/EffectEditor.tsx:881` also uses amber-600 in light mode, **3.19:1**. The recovery icon at `:970` is not counted as a separate text failure.
- Fix direction: darken light-mode warning/error text for the actual tinted backgrounds and remove unnecessary opacity.

### 7. Medium: editor error-count badges inherit an unsuitable foreground

- `src/pages/EffectEditorPage/components/EffectEditor/EffectEditor.tsx:1612`: `text-destructive-foreground` is used, but no matching color token is defined in `src/index.css`.
- The number inherits tab text color over `bg-destructive`. For inactive tabs this produces about **1.01:1 light / 1.12:1 dark**. Active tabs produce **4.15:1 light / 2.77:1 dark**, also below the requirement for 10px text.
- Fix direction: define an explicit foreground/background pair for this badge in each theme. White alone does not pass on the current full-strength dark-theme destructive background.

### 8. Medium: code-editor highlighted text loses contrast in both themes

- `src/pages/EffectEditorPage/components/CodeEditor/editorTheme.ts:66`: light active-line background `#f0e9dc` reduces muted text `#786b59` (line numbers/comments/punctuation) to **4.30:1**.
- Same file `:69` and `:98`: selection and selected autocomplete rows use a background that is too close to several syntax/detail colors.
- On the light selection background `#e8d1aa`, muted text is **3.49:1** and type names are **4.14:1**. Amber, string, number, and error colors also fall below 4.5:1.
- On the dark selection background `#695033`, muted text is **2.72:1**, keywords **4.00:1**, and type names **4.06:1**. Amber, string, number, and error colors also fall below 4.5:1.
- Fix direction: adjust highlighted backgrounds and/or highlighted foregrounds, including autocomplete detail text. The unhighlighted syntax colors pass against the normal editor backgrounds.

### 9. Shared controls: faint boundaries and focus indicators

- `src/components/ui/input.tsx:11` uses a light border of approximately **1.26:1** against white; the dark input border is approximately **1.48:1** against the dark page. The dark fill is also very close to its surrounding surface. Where this boundary identifies the editable region, it needs stronger contrast.
- `src/components/ui/switch.tsx:18`: the light unchecked switch uses the same pale input color; its white thumb against that track is approximately **1.26:1**.
- `src/components/ui/button.tsx:8`, `src/components/ui/input.tsx:12`, and `src/components/ui/select.tsx:38`: `ring-ring/50` gives approximately **1.54:1 light / 1.85:1 dark** against the page backgrounds. These rings need a stronger color where they are the visible keyboard-focus indicator. Verify individual controls because some also alter their borders.
- These are control-indicator findings, distinct from normal-text failures. Decorative card borders and separators are not counted.

## What looked sound

The standard foreground/background and unmodified muted/card pairs pass in both themes. Landing-page body copy and main actions have deliberately paired light/dark colors; the reduced-opacity example caption is the clear exception found there. The ordinary, unselected code-editor palette passes in both themes. Green Wi-Fi icons alongside readable “Online” text were not counted as independent failures, since the text already conveys the status.

## Original suggested order

1. Fix the invisible scene copy and error-count badge foregrounds.
2. Add consistent accessible success/warning/error pairs for both themes.
3. Remove extra opacity from meaningful metadata and captions.
4. Adjust code selection/autocomplete colors and shared control indicators.
5. After the local backend/auth environment is available, rerun an authenticated browser audit across page states, hovered/focused controls, and bright/dark scene maps.


## Remediation results

All nine finding groups were addressed:

- Scene loading/recovery messages now render on an explicit themed surface with semantic foreground/error text.
- Shared `success` and `warning` tokens use dark greens/ambers in light mode and bright greens/ambers in dark mode. Status labels, verification/count badges, and recovery notices use these tokens.
- Light-mode destructive text is darker. A paired `destructive-foreground` token now supplies badge/button text in both themes, including editor error counts. Destructive buttons and badges retain this pair on hover.
- Meaningful player metadata and the landing caption no longer have extra opacity. Light muted text is slightly darker, and the light active-player card uses a subtle amber tint.
- The landing-caption fix is applied to `ProductShowcase.tsx` after the upstream Tailwind refactor; the original `landing.css` findings above refer to the pre-refactor audit.
- Save-status HUD uses an opaque theme surface so map imagery cannot wash out its text.
- Editor selection backgrounds and light muted syntax colors pass the text threshold. The focused selection selector now matches CodeMirror's base-theme specificity; the browser confirmed the actual selected backgrounds are `rgb(239, 224, 201)` (light) and `rgb(54, 48, 39)` (dark).
- Input/switch boundary colors are solid and stronger. Input fills remain subtle using the separate muted token. Focus rings use the full ring color with a 2px surface-colored offset, including destructive controls. Workshop cards use the same accessible focus color.

Verification: 154 numerical checks passed across both themes, covering normal/muted/status text on page/card/muted/accent surfaces; tinted status/error surfaces; destructive hover pairs; input borders/fills; switch thumbs; focus indicators; landing captions; and every editor syntax color against normal, active, selected, and popup surfaces.

Representative corrected ratios:

| Pair | Light | Dark |
| --- | ---: | ---: |
| Scene foreground/page | 19.75:1 | 18.92:1 |
| Muted metadata/card | 6.02:1 | 6.76:1 |
| Destructive text/tinted error surface | 5.33:1 | 6.16:1 |
| Editor selected muted text | 5.09:1 | 4.73:1 |

An isolated browser preview verified actual DiagnosticsPanel, Input, Select, Switch, Button, Badge, and CodeMirror rendering in both themes, selected-code backgrounds, and keyboard-focus ring styles. The full application remains unavailable locally without `VITE_CONVEX_URL`; authenticated page flows and live map imagery were not exercised. Temporary preview files were removed.

Final checks: production build (including TypeScript and React Compiler) passed; ESLint passed; `git diff --check` passed. Vite still reports large output chunks.
