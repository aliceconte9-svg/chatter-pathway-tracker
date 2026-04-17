import { useEffect, useState, useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  const handler = () => cb();
  window.addEventListener("chatter:storage", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("chatter:storage", handler);
    window.removeEventListener("storage", handler);
  };
}

export function useStore<T>(getter: () => T): T {
  // Hydration-safe: use state on server snapshot
  const [snap, setSnap] = useState<T>(() => getter());
  useEffect(() => {
    setSnap(getter());
    const handler = () => setSnap(getter());
    window.addEventListener("chatter:storage", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("chatter:storage", handler);
      window.removeEventListener("storage", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return snap;
}

// Keep subscribe exported in case we want useSyncExternalStore variant
export { subscribe };
export { useSyncExternalStore };
