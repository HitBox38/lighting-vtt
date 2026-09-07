import { useSyncExternalStore } from "react";

const desktop = window.matchMedia("(min-width: 1024px)");
const wideReference = window.matchMedia("(min-width: 640px)");
const subscribeDesktop = (notify: () => void) => {
  desktop.addEventListener("change", notify);
  return () => desktop.removeEventListener("change", notify);
};
const subscribeReference = (notify: () => void) => {
  wideReference.addEventListener("change", notify);
  return () => wideReference.removeEventListener("change", notify);
};

export function useWorkbenchMedia() {
  return {
    isDesktop: useSyncExternalStore(subscribeDesktop, () => desktop.matches),
    isReferenceBeside: useSyncExternalStore(
      subscribeReference,
      () => wideReference.matches,
    ),
  };
}
