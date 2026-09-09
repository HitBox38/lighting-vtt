import { EFFECT_EDITOR_NEW_PATH, EFFECT_LIBRARY_PATH } from "./effects/routes.ts";

export interface PageMetadata {
  title: string;
  description: string;
}

// Shared by the HTML build and client navigation so the copy stays in sync.
export const PAGE_METADATA = {
  home: {
    title: "Dynamic Lighting for TV Table Battlemaps | Lighting VTT",
    description:
      "Bring your battlemap to life with dynamic lighting, custom effects, and a player view for your TV table. Build atmospheric encounters in your browser.",
  },
  effects: {
    title: "Battlemap Effects Library & Workshop | Lighting VTT",
    description:
      "Explore custom battlemap effects for your next encounter. Browse the Lighting VTT effects library, adjust their controls, and add atmosphere to your scenes.",
  },
  privacy: {
    title: "Privacy Policy | Lighting VTT",
    description:
      "Learn how Lighting VTT handles account information, uploaded maps, and game data. Read about cookies, service providers, data retention, and your privacy choices.",
  },
  terms: {
    title: "Terms & Conditions | Lighting VTT",
    description:
      "Read the terms for using Lighting VTT, including accounts, uploaded maps, multiplayer games, community effects, acceptable use, and content permissions.",
  },
  library: {
    title: "Your Scene Library | Lighting VTT",
    description:
      "Manage your Lighting VTT scenes and joined games. Upload a battlemap, prepare lighting and effects, and open an encounter for your next game night.",
  },
  scene: {
    title: "Battlemap Scene Editor | Lighting VTT",
    description:
      "Set the scene for your next encounter. Add lights, tokens, and custom effects to your battlemap, save lighting presets, and open a dedicated player view.",
  },
  player: {
    title: "Battlemap Player View | Lighting VTT",
    description:
      "See your party's battlemap with lighting, tokens, and effects in Lighting VTT's player view, built for your TV table or joining the encounter remotely.",
  },
  join: {
    title: "Join a Game | Lighting VTT",
    description:
      "Join your party's Lighting VTT encounter in your browser. Enter your player and character names to connect to the shared battlemap. Player sign-in is optional.",
  },
  newEffect: {
    title: "Create a Battlemap Effect | Lighting VTT",
    description:
      "Create a custom battlemap effect in the Lighting VTT workshop. Start with a template, edit the code, and preview the result before adding it to a scene.",
  },
  editEffect: {
    title: "Battlemap Effect Editor | Lighting VTT",
    description:
      "Open an effect in the Lighting VTT workshop. Explore its code, adjust parameters, and preview your changes to shape the atmosphere of your next encounter.",
  },
} satisfies Record<string, PageMetadata>;

export function getPageMetadata(pathname: string, search = ""): PageMetadata {
  const path = pathname.replace(/\/+$/, "").toLowerCase() || "/";
  if (path === EFFECT_LIBRARY_PATH) return PAGE_METADATA.effects;
  if (path === "/privacy") return PAGE_METADATA.privacy;
  if (path === "/terms") return PAGE_METADATA.terms;
  if (path === EFFECT_EDITOR_NEW_PATH) return PAGE_METADATA.newEffect;
  if (/^\/effects\/[^/]+$/.test(path)) return PAGE_METADATA.editEffect;
  if (path === "/library") return PAGE_METADATA.library;
  if (/^\/join\/[^/]+$/.test(path)) return PAGE_METADATA.join;
  if (path === "/scene") {
    const params = new URLSearchParams(search);
    return params.get("isGM") === "false" || params.get("playerId")
      ? PAGE_METADATA.player
      : PAGE_METADATA.scene;
  }
  return PAGE_METADATA.home;
}
