# Lighting VTT

A high-performance 2D Virtual Tabletop (VTT) application designed for TV/Table gaming setups. Built with modern web technologies to deliver smooth map rendering and dynamic lighting effects.

## Features

### 🗺️ Map Layer

- Display large map images with smooth pan and zoom capabilities
- Optimized for high-performance rendering of detailed game maps

### 💡 Dynamic Lighting System

- **Darkness Layer (Fog)**: Render a complete darkness overlay
- **Light Sources**: Cut out illumination from the darkness layer
- **Light Types**:
  - **Radial**: Simple circular light around a point
  - **Conic**: Cone-shaped light from source to target point

### 🎭 Scene Presets

- Save current lighting configurations as reusable "Scenes"
- Instant switching between saved lighting setups
- Random scene transitions for dynamic gameplay

## Legal pages and Clerk

Public legal pages are served at `/privacy` and `/terms`, with links in the
landing footer and Clerk authentication forms. Edit the operator name and
contact email in `src/lib/legal.ts`; both documents use those shared values.
The policy text and its update date live in `src/pages/LegalPage/`.

Clerk links to these documents; it does not host or generate them. For the
Clerk-hosted Account Portal, configure the full production URLs on the Clerk
Dashboard's **Legal** page. Enable **Require express consent to legal documents**
there if sign-up must include an acceptance checkbox. The frontend link
configuration does not enable that requirement or record acceptance by itself.
See [Clerk legal compliance](https://clerk.com/docs/guides/secure/legal-compliance).

Before publishing, review the document wording against your actual operating
practices, especially provider retention, international transfers, and analytics
consent requirements. Adding these pages does not implement a cookie consent
flow or automatic deletion of application data when a Clerk account is deleted.

## Tech Stack

- **Frontend**: React 19 with TypeScript 7
- **Build Tool**: Vite
- **Runtime**: Bun 1.4.2
- **State Management**: Zustand
- **UI Framework**: TailwindCSS + shadcn/ui
- **Rendering Engine**: Pixi.js v8 + @pixi/react
- **Architecture**: Component-based with serializable state for future database integration

## Getting Started

### Prerequisites

- [Bun](https://bun.com/) 1.4.2 (run `bun upgrade` to update your installation)
- Node.js 24 LTS (for tooling compatibility)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/HitBox38/lighting-vtt
cd lighting-vtt
```

2. Install dependencies:

```bash
bun install --frozen-lockfile
```

3. Start the development server:

```bash
bun run dev
```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

### Build for Production

```bash
bun run build
```

### Dependency tooling

Bun is the package manager; commit `bun.lock` when updating dependencies. The
`packageManager` field and the project Bun dependency track Bun 1.4.2.

`bun run build` uses TypeScript 7 (`tsc`). The `typescript` package name aliases
`@typescript/typescript6` so ESLint and other compiler-API consumers use the
compatible TypeScript 6 API. `@typescript/native` supplies TypeScript 7 without
an executable name collision. Vite 8 uses Rolldown, with the Babel React Compiler
preset enabled for production builds as well as development.

Checks: `bun run lint`, `bun run test:workshop`, `bun run build`, and
`bunx --no-install tsc --noEmit -p convex/tsconfig.json`.

Workpool upgrade rollback: once Workpool 0.4 has stored large job payloads,
rollback requires at least 0.3.2; do not redeploy 0.3.0 against that data.
See the [Workpool changelog](https://github.com/get-convex/workpool/blob/main/CHANGELOG.md).

### Preview Production Build

```bash
bun run preview
```

### Vercel previews

Vercel redirects incoming HTTP traffic to HTTPS and supplies HSTS. The response
header in `vercel.json` also upgrades browser HTTP resource requests to HTTPS;
resources without HTTPS support fail to load. This browser policy does not
control outbound requests from Convex actions or links to other websites.

All frontend builds (including previews) require absolute HTTPS values for
`VITE_CONVEX_URL` and `VITE_CONVEX_SITE_URL`, and for
`VITE_PUBLIC_POSTHOG_HOST` when configured. Validation runs before bundling;
the Vite development server still allows local HTTP endpoints.

`vercel.json` pins the install to Bun 1.4.2 with a frozen lockfile and runs
`convex deploy` before completing the deployment. Convex supplies both
`VITE_CONVEX_URL` and `VITE_CONVEX_SITE_URL` to the frontend build, so uploads
target the same backend as the rest of the app.

Configure separate `CONVEX_DEPLOY_KEY` values in Vercel: the production key must
be scoped only to Production, and a Convex **preview deploy key** must be scoped
only to Preview. Convex selects an isolated preview backend using the Git branch
name. Never bypass Convex's production-key check for a preview build.

Use a Clerk development instance's `VITE_CLERK_PUBLISHABLE_KEY` in Vercel Preview.
Set the matching `CLERK_JWT_ISSUER_DOMAIN` in Convex's default environment
variables for preview deployments. Uploads also require `UPLOADTHING_TOKEN` in
the preview **Convex backend** environment. To exercise thumbnail generation,
enable `EFFECT_THUMBNAILS_ENABLED=true` there. Preview backends have their own
data; production library contents are not copied automatically.

See [Convex's Vercel preview setup](https://docs.convex.dev/production/hosting/vercel#preview-deployments).

### Shader thumbnails

Shader previews are generated asynchronously in the Convex backend. Each
deployment requires `EFFECT_THUMBNAILS_ENABLED=true`; setting it only in Vercel
does not enable generation. Saving while the flag is unset does not enqueue a
thumbnail, and enabling it later does not automatically process existing effects.

To activate or repair generation in the intended Convex deployment:

1. Run the internal `thumbnailDiagnostics:probe` action with
   `{ "effects": true, "freshCache": true }`. It must successfully render the
   fixtures using the deployed Linux ARM64 runtime before enabling jobs. This
   check does not retain images unless `retainImages` is explicitly requested.
2. Set `EFFECT_THUMBNAILS_ENABLED=true` in that Convex deployment.
3. Run internal `thumbnails:backfill` with `{}`. Repeat with
   `{ "cursor": "<returned cursor>" }` until `done: true`. This requests images
   for existing shaders' latest saved versions and missing images of their exact
   public releases. Generation finishes separately.
4. If jobs previously failed, first repair the cause reported by the diagnostic
   probe or `effect_thumbnail_failed` logs, then repeat the backfill with
   `{ "retryFailed": true }` (and the returned cursor on subsequent pages).
   This resets exhausted attempts without restarting ready or active jobs.

Public-release repair has a separate job slot from latest-draft rendering and
shares the same two-worker limit. Existing exact-version images are reused;
private draft images never replace a public release. Verify the public library
and DM workshop after jobs finish; backfill completion alone does not confirm
rendering succeeded.

Deployment adds an optional job target and index without rewriting existing rows.
After published-target jobs exist, rollback must retain this additive schema and
target-aware reads; old code assumes one job per effect. Disable generation to
pause jobs and roll forward with a fix instead of redeploying that old code.

## Project Structure

```
src/
├── components/          # React components
│   ├── LightingLayer.tsx    # Main lighting system component
│   └── ...
├── hooks/              # Custom React hooks
├── stores/             # Zustand state stores
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── lib/                # Library configurations
```

## Development

### Key Components

- **LightingLayer**: Core component handling Pixi.js rendering and lighting calculations
- **State Management**: Zustand stores for lights, scenes, and application state
- **Performance**: Optimized rendering with Pixi.js for smooth 60fps performance

### Lighting System Architecture

The lighting system uses a multi-layered approach:

1. **Base Layer**: Map image
2. **Darkness Layer**: Full-screen fog overlay
3. **Light Masks**: Individual light shapes that cut through the darkness
4. **Composite**: Final rendered output combining all layers

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
