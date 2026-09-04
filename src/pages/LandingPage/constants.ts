import {
  FlipHorizontal2,
  Globe,
  Layers,
  type LucideIcon,
  Sun,
  Swords,
  Target,
} from "lucide-react";

export interface Feature {
  icon: LucideIcon;
  label: string;
  description: string;
}

export const FEATURES: Feature[] = [
  {
    icon: Sun,
    label: "Radial Lights",
    description:
      "Place point lights that cast circular illumination with adjustable radius. Drag them around the map to light up rooms, campfires, or any area of interest.",
  },
  {
    icon: Target,
    label: "Conic Lights",
    description:
      "Directional cones of light aimed from a source to a target point. Use them for wall torches, character vision cones, or spotlight effects.",
  },
  {
    icon: FlipHorizontal2,
    label: "Mirrors",
    description:
      "Place reflective surfaces that bounce light realistically. Build complex lighting setups where beams redirect off mirrors across the map.",
  },
  {
    icon: Layers,
    label: "Scene Presets",
    description:
      "Save your full lighting configuration as a named preset. Switch between setups instantly or cycle through them for dynamic encounters.",
  },
  {
    icon: Swords,
    label: "Tokens & Initiative",
    description:
      "Drop character and creature tokens with custom images and sizes. Track turn order with the built-in initiative sidebar.",
  },
  {
    icon: Globe,
    label: "Online Play",
    description:
      "Generate an invite link for your players. They join from their browser and see your map with live lighting updates in real time.",
  },
];
