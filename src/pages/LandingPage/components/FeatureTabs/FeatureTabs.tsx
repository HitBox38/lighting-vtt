import { useState } from "react";

import { cn } from "@/lib/utils";
import { FEATURES } from "@/pages/LandingPage/constants";

export function FeatureTabs() {
  const [activeFeature, setActiveFeature] = useState(0);
  const active = FEATURES[activeFeature];

  return (
    <section
      className="animate-fade-slide-up border-t border-border/40 px-6 py-14"
      style={{ animationDelay: "240ms" }}>
      <div className="mx-auto flex max-w-xl flex-col items-center">
        <div role="tablist" aria-label="Features" className="flex flex-wrap items-center justify-center gap-1">
          {FEATURES.map((feature, index) => (
            <button
              key={feature.label}
              type="button"
              role="tab"
              aria-selected={index === activeFeature}
              aria-controls="feature-panel"
              onClick={() => setActiveFeature(index)}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                index === activeFeature
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}>
              <feature.icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {feature.label}
            </button>
          ))}
        </div>
        {active ? (
          <p
            key={activeFeature}
            id="feature-panel"
            role="tabpanel"
            className="mt-5 max-w-sm animate-fade-slide-up text-center text-sm leading-relaxed text-muted-foreground">
            {active.description}
          </p>
        ) : null}
      </div>
    </section>
  );
}
