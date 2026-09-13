"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Reactive media-query state (SSR-safe; defaults to false on the server). */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const queryList = window.matchMedia(query);
      queryList.addEventListener("change", onStoreChange);
      return () => queryList.removeEventListener("change", onStoreChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
