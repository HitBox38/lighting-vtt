# Landing-page refresh

The homepage targets DMs using a TV table. Signup uses the existing Clerk modal and `/library` redirect; signed-in CTAs link directly to the library. Effects links retain `/effects`.

## Artwork

No AI-generated art is included. The screenshots use Dyson Logos's artist-drawn Temple Complex Ruins, adapted to pale lines on charcoal and rendered through the current GameCanvas. See [asset attribution and license](../public/landing/ATTRIBUTION.md).

The local sample uses three Lightling tokens, radial and conic lights, and the checked-in Arcane Portal and Ember Glow starter shaders. The DM/player screenshots share the same scene and viewport. Additional captures show the light inspector, preset selector, and effect inspector. Fixtures used local query results, null scene/creator IDs, and rejected all mutations/actions. They did not create or modify a backend scene. The development-only frame counter was hidden to match production.

## Analytics

- `activation_landing_viewed`: existing landing event, retained.
- `landing_cta_clicked`: `placement` (`header`, `hero`, `workshop`, `closing`) and `action` (`sign_up`, `sign_in`, `open_library`, `how_it_works`, `explore_effects`).
- `landing_showcase_changed`: `view` (`player`, `dm`), only when the chosen view changes.

All captures use `usePostHog`. Assess conversion alongside the existing library-view and scene-created events; CTA clicks are not completed registrations. No conversion improvement is claimed from the redesign alone.

## Verification (2026-09-07)

- Edge browser: 390, 768, and 1440 px in light/dark themes; additional 320 px overflow check. No page exceptions or broken landing images.
- Real Clerk signup and sign-in modal opening, existing redirect configuration, section anchor, effects-link targets, FAQ expansion, keyboard activation of the view switch, and reduced-motion behavior.
- Controlled signed-in component test: all three library CTAs point to `/library`; clicking navigates there. Verified CTA event properties and one showcase event per actual view change. This is not an authenticated backend session test.
- Responsive WebP screenshots: roughly 40–108 KB per asset; initial player view loads eagerly, lower feature screenshots load lazily.
- `bun run lint` and `bun run build` pass with React Compiler retained. The build reports the existing large application chunks; this refresh adds no renderer or editor dependency to the landing components.

## Release

No deployment, backend change, or account creation is part of this refresh. Before publishing, verify that the target deployment has the workshop features advertised here. The earlier [workshop notes](effect-workshop.md) describe a development-only rollout and pending authenticated persistence/remote-session checks. This landing-page verification does not resolve those checks.
