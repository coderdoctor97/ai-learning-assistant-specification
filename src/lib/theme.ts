/*
 * Theme application with a 150ms token cross-fade: the .theme-fade class
 * (see globals.css) temporarily transitions background/border/text colors
 * across the whole document while the data-theme attribute flips, so theme
 * switches melt instead of snap. Skipped entirely for reduced motion.
 */
const FADE_CLASS = "theme-fade";
const FADE_DURATION_MS = 220;

let fadeTimer: ReturnType<typeof setTimeout> | null = null;

export function applyTheme(theme: string, options: { crossfade?: boolean } = {}) {
  const root = document.documentElement;
  const reduced =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const crossfade = options.crossfade !== false && !reduced;

  if (!crossfade) {
    root.setAttribute("data-theme", theme);
    return;
  }
  root.classList.add(FADE_CLASS);
  root.setAttribute("data-theme", theme);
  if (fadeTimer) clearTimeout(fadeTimer);
  fadeTimer = setTimeout(() => root.classList.remove(FADE_CLASS), FADE_DURATION_MS);
}
