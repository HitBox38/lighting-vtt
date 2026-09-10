import { publicContainerStyles } from "@/lib/publicPageStyles";
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
      className={publicContainerStyles}
      aria-label="Explore the tabletop views"
    >
      <div className="flex items-center justify-between gap-3.5 rounded-t-[10px] border border-b-0 border-(--lp-line) bg-(--lp-panel) px-[19px] py-3 max-[760px]:flex-col max-[760px]:items-stretch max-[760px]:gap-3 max-[760px]:px-3">
        <span className="flex items-center gap-2 text-[10px] tracking-[1.5px] text-(--lp-muted) max-[760px]:justify-center">
          <span className="size-[5px] rounded-full bg-[#ffb547]" />
          THE TEMPLE RUINS
          <span className="opacity-75 max-[1000px]:hidden"> / EXAMPLE ENCOUNTER</span>
        </span>
        <div
          className="flex gap-[3px] rounded-md border border-(--lp-line) p-[3px]"
          role="group"
          aria-label="Screenshot view"
        >
          {(["player", "dm"] as const).map((value) => {
            const Icon = value === "player" ? Monitor : SlidersHorizontal;
            return (
              <button
                key={value}
                type="button"
                className="flex min-h-[34px] cursor-pointer items-center justify-center gap-[7px] rounded-[3px] px-3 py-[5px] text-xs/[1.5] text-(--lp-muted) aria-pressed:bg-(--lp-text) aria-pressed:text-(--lp-bg) max-[760px]:min-h-11 max-[760px]:flex-1 max-[480px]:min-w-0 max-[480px]:px-2"
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
        <div className="aspect-video overflow-hidden rounded-b-lg border border-(--lp-line) bg-[#0c0d0b]" id="showcase-image">
          <img
            src={`/landing/temple-${view}-1600.webp`}
            srcSet={`/landing/temple-${view}-800.webp 800w, /landing/temple-${view}-1600.webp 1600w`}
            sizes="(max-width: 760px) calc(100vw - 32px), (max-width: 1280px) calc(100vw - 80px), 1200px"
            width={1600}
            height={900}
            alt={views[view].alt}
            fetchPriority="high"
            className="block size-full object-cover"
          />
        </div>
        <figcaption className="mt-[17px] flex items-start justify-between gap-6 text-xs/[1.5] leading-[1.6] text-(--lp-muted) max-[1000px]:flex-col max-[1000px]:gap-1">
          <p aria-live="polite" className="min-h-[39px] max-w-[620px] max-[1000px]:min-h-0">{views[view].caption}</p>
          <span className="shrink-0 pt-0.5 text-[10px]">
            Example screenshots · Adapted map ·{" "}
            <a
              href="https://dysonlogos.blog/2016/07/18/release-the-kraken-the-temple-complex-ruins/"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-3"
            >
              Cartography by Dyson Logos
            </a>
          </span>
        </figcaption>
      </figure>
    </section>
  );
}
