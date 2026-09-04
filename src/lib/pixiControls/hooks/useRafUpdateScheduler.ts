import { useEffect, useRef } from "react";

export function useRafUpdateScheduler<TPartial>(
  update: (id: string, partial: TPartial) => void,
) {
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ id: string; partial: TPartial } | null>(null);
  const updateRef = useRef(update);

  useEffect(() => {
    updateRef.current = update;
  });

  const flush = () => {
    if (rafRef.current !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const pending = pendingRef.current;
    if (!pending) {
      return;
    }
    pendingRef.current = null;
    updateRef.current(pending.id, pending.partial);
  };

  const schedule = (id: string, partial: TPartial) => {
    if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
      updateRef.current(id, partial);
      return;
    }

    pendingRef.current = { id, partial };

    if (rafRef.current !== null) {
      return;
    }

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      const pending = pendingRef.current;
      if (!pending) {
        return;
      }
      pendingRef.current = null;
      updateRef.current(pending.id, pending.partial);
    });
  };

  useEffect(() => {
    return () => {
      flush();
    };
  }, []);

  return { schedule, flush };
}
