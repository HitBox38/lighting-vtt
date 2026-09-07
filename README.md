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

Effect-library shader thumbnails are rendered asynchronously in Convex. See the
[effect thumbnail architecture and operations](docs/effect-thumbnails.md).

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Runtime**: Bun
- **State Management**: Zustand
- **UI Framework**: TailwindCSS + shadcn/ui
- **Rendering Engine**: Pixi.js v8 + @pixi/react
- **Architecture**: Component-based with serializable state for future database integration

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) runtime
- Node.js (for some tooling compatibility)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/HitBox38/lighting-vtt
cd lighting-vtt
```

2. Install dependencies:

```bash
bun install
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

### Preview Production Build

```bash
bun run preview
```

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
