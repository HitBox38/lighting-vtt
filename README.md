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
