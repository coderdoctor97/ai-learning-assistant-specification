"use client";

import { useEffect, useRef, useState } from "react";

/*
 * Motion choreography helpers (motion-and-animation workstream).
 *
 * • RevealController — viewport-bound reveals for the landing page. Marks
 *   the document [data-reveal-ready] (CSS then hides [data-reveal] nodes)
 *   and toggles .is-inview via IntersectionObserver as each node scrolls
 *   into view. Reduced-motion users skip hiding entirely.
 * • useOffscreenPause — gates infinite keyframe loops (pulse, shimmer,
 *   caret) behind [data-offscreen] so nothing animates offscreen.
 * • useGhostExits — keeps removed list items mounted for one exit
 *   animation, powering message fade-outs on regenerate/remove.
 */

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Reveals landing sections as they enter the viewport. Renders nothing. */
export function RevealController() {
  useEffect(() => {
    const root = document.documentElement;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      // Never hide content: settled state without observers.
      nodes.forEach((node) => node.classList.add("is-inview"));
      return;
    }
    root.setAttribute("data-reveal-ready", "true");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-inview");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => {
      observer.disconnect();
      root.removeAttribute("data-reveal-ready");
    };
  }, []);
  return null;
}

/**
 * Returns a ref to attach to a container of infinite animations. While the
 * container is offscreen, `data-offscreen="true"` pauses every keyframe
 * loop inside it (CSS: animation-play-state).
 */
export function useOffscreenPause<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        element.setAttribute("data-offscreen", entry.isIntersecting ? "false" : "true");
      },
      { rootMargin: "96px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return ref;
}

/**
 * Diff-based exit ghosts: when items disappear (regeneration, deletion),
 * the removed entries keep rendering (flagged `exiting`) for `durationMs`
 * so CSS can play the exit animation, then they unmount.
 */
export function useGhostExits<T extends { id: string }>(
  items: T[],
  durationMs = 260,
): { live: T[]; ghosts: T[] } {
  const [ghosts, setGhosts] = useState<T[]>([]);
  const previous = useRef<Map<string, T>>(new Map());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const previousById = previous.current;
    const currentIds = new Set(items.map((item) => item.id));
    const removed = [...previousById.values()].filter((item) => !currentIds.has(item.id));
    previous.current = new Map(items.map((item) => [item.id, item]));
    if (!removed.length) return;
    setGhosts(removed);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setGhosts([]), durationMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [items, durationMs]);

  return { live: items, ghosts };
}
