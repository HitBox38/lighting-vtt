import { useId } from "react";
import type { CatalogItem } from "@/lib/effects/catalog";

export function EffectGlyph({
  item,
  className = "",
}: {
  item: CatalogItem;
  className?: string;
}) {
  const id = useId();
  return (
    <svg viewBox="0 0 100 64" aria-hidden="true" className={className}>
      <defs>
        <radialGradient id={id}>
          <stop stopColor="currentColor" stopOpacity=".6" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path
        d="M0 16H100M0 32H100M0 48H100M25 0V64M50 0V64M75 0V64"
        stroke="currentColor"
        opacity=".08"
      />
      {item.kind === "mirror" ? (
        <>
          <path d="M27 49L73 15" stroke="currentColor" strokeWidth="3" />
          <path
            d="M10 15L50 32L90 49"
            fill="none"
            stroke="currentColor"
            strokeDasharray="3 3"
          />
        </>
      ) : item.kind === "light" && item.type === "line" ? (
        <>
          <path
            d="M20 32H80"
            stroke="currentColor"
            strokeWidth="16"
            opacity=".15"
          />
          <path d="M20 32H80" stroke="currentColor" strokeWidth="2" />
        </>
      ) : item.kind === "light" && item.type === "conic" ? (
        <>
          <path d="M23 32L79 8Q96 32 79 56Z" fill={`url(#${id})`} />
          <path
            d="M23 32L79 8M23 32L79 56"
            stroke="currentColor"
            opacity=".5"
          />
        </>
      ) : (
        <>
          <circle cx="50" cy="32" r="31" fill={`url(#${id})`} />
          <circle
            cx="50"
            cy="32"
            r={item.kind === "effect" ? 20 : 4}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          {item.kind === "effect" ? (
            <path
              d="M50 8L58 24L75 32L58 40L50 56L42 40L25 32L42 24Z"
              fill="none"
              stroke="currentColor"
              opacity=".6"
            />
          ) : null}
        </>
      )}
    </svg>
  );
}
