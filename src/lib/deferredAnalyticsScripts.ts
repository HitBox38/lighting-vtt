/** Preserve PostHog's script nodes/listeners while delaying optional downloads. */
export function createDeferredAnalyticsScripts() {
  const pending = new Map<HTMLScriptElement, string>();
  let ready = false;

  return {
    prepare(script: HTMLScriptElement): HTMLScriptElement {
      const url = new URL(script.src);
      if (!ready && /\/(?:posthog-recorder|recorder|surveys)\.js$/.test(url.pathname)) {
        pending.set(script, script.src);
        // An empty script does not start fetching. Setting src later lets the
        // SDK's original load/error listeners complete initialization normally.
        script.removeAttribute("src");
      }
      return script;
    },
    resume() {
      ready = true;
      pending.forEach((src, script) => { script.src = src; });
      pending.clear();
    },
  };
}

export const deferredAnalyticsScripts = createDeferredAnalyticsScripts();
