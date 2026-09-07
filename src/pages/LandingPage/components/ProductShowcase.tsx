import { useState } from "react";
import { usePostHog } from "@posthog/react";
import { Monitor, SlidersHorizontal } from "lucide-react";
import { ANALYTICS_EVENTS } from "@/lib/analytics";

const views = {
  player: {
    label: "Player view",
    caption:
      "The encounter, ready for the table. Your players see the map, lighting, and tokens without your editing tools.",
    alt: "Player view of the Temple Complex Ruins with illuminated rooms, party tokens, and a glowing portal.",
  },
  dm: {
    label: "DM view",
    caption:
      "Your side of the screen. Keep the scene controls and Effect Workshop close while you shape the encounter.",
    alt: "The same temple encounter in DM view, with scene controls and the Effect Workshop open.",
  },
} as const;

export function ProductShowcase() {
  const [view, setView] = useState<keyof typeof views>("player");
  const posthog = usePostHog();
  return (
    <section
      className="landing-showcase landing-container"
      aria-label="Explore the tabletop views"
    >
      <div className="landing-showcase-bar">
        <span className="landing-scene-label">
          <span />
          THE TEMPLE RUINS
          <span className="landing-example"> / EXAMPLE ENCOUNTER</span>
        </span>
        <div
          className="landing-view-switch"
          role="group"
          aria-label="Screenshot view"
        >
          {(["player", "dm"] as const).map((value) => {
            const Icon = value === "player" ? Monitor : SlidersHorizontal;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={view === value}
                aria-controls="showcase-image"
                onClick={() => {
                  if (view !== value) {
                    setView(value);
                    posthog.capture(ANALYTICS_EVENTS.LandingShowcaseChanged, {
                      view: value,
                    });
                  }
                }}
              >
                <Icon size={14} aria-hidden="true" />
                {views[value].label}
              </button>
            );
          })}
        </div>
      </div>
      <figure>
        <div className="landing-showcase-image" id="showcase-image">
          <img
            src={`/landing/temple-${view}-1600.webp`}
            srcSet={`/landing/temple-${view}-800.webp 800w, /landing/temple-${view}-1600.webp 1600w`}
            sizes="(max-width: 760px) calc(100vw - 32px), (max-width: 1280px) calc(100vw - 80px), 1200px"
            width={1600}
            height={900}
            alt={views[view].alt}
            fetchPriority="high"
          />
        </div>
        <figcaption>
          <p aria-live="polite">{views[view].caption}</p>
          <span>
            Example screenshots · Adapted map ·{" "}
            <a
              href="https://dysonlogos.blog/2016/07/18/release-the-kraken-the-temple-complex-ruins/"
              target="_blank"
              rel="noreferrer"
            >
              Cartography by Dyson Logos
            </a>
          </span>
        </figcaption>
      </figure>
    </section>
  );
}
