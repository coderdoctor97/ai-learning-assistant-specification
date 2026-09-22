/* Presentational stroke icons for studio chrome. currentColor, 16×16.
   One design language for every glyph: 1.5 stroke, round caps/joins,
   ~2.25px canvas margin, optically centred — no per-glyph drift. */

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type IconName =
  | "menu"
  | "plus"
  | "settings"
  | "search"
  | "chevronLeft"
  | "chevronDown"
  | "more"
  | "close"
  | "star"
  | "sun"
  | "moon"
  | "study"
  | "refresh"
  | "check"
  | "copy"
  | "send"
  | "paperclip"
  | "file"
  | "image"
  | "download"
  | "pencil"
  | "chevronRight"
  | "warn"
  | "panelLeftOpen"
  | "panelLeftClose"
  | "plusSquare"
  | "folderPlus"
  | "trash2"
  | "moreHorizontal"
  | "checkCircle2"
  | "alertTriangle"
  | "circle"
  | "bot"
  | "sparkles"
  | "brain"
  | "lightbulb"
  | "refreshCw"
  | "rotateCw"
  | "maximize2"
  | "minimize2"
  | "fileText"
  | "archive"
  | "fileSpreadsheet"
  | "fileDown"
  | "code2"
  | "eye"
  | "keyRound"
  | "arrowUp"
  | "arrowDown"
  | "bookOpen"
  | "activity"
  | "x";

const PATHS: Record<IconName, ReactNode> = {
  menu: (
    <>
      <path d="M2.75 4.5h10.5" />
      <path d="M2.75 8h10.5" />
      <path d="M2.75 11.5h10.5" />
    </>
  ),
  plus: (
    <>
      <path d="M8 3.25v9.5" />
      <path d="M3.25 8h9.5" />
    </>
  ),
  settings: (
    <>
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 2.25v1.75M8 12v1.75M2.25 8H4M12 8h1.75M3.9 3.9l1.2 1.2M10.9 10.9l1.2 1.2M12.1 3.9l-1.2 1.2M5.1 10.9l-1.2 1.2" />
    </>
  ),
  search: (
    <>
      <circle cx="7" cy="7" r="4.25" />
      <path d="M10.2 10.2 13.5 13.5" />
    </>
  ),
  chevronLeft: <path d="M10 3.75 5.75 8l4.25 4.25" />,
  chevronDown: <path d="M3.75 6 8 10.25 12.25 6" />,
  chevronRight: <path d="M6 3.75 10.25 8 6 12.25" />,
  more: (
    <>
      <circle cx="3.4" cy="8" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12.6" cy="8" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  close: (
    <>
      <path d="m4.25 4.25 7.5 7.5" />
      <path d="M11.75 4.25l-7.5 7.5" />
    </>
  ),
  star: (
    <path d="M8 2.75 9.75 6.2 13.7 6.65 10.75 9.4 11.6 13.35 8 11.3 4.4 13.35 5.25 9.4 2.3 6.65 6.25 6.2z" />
  ),
  sun: (
    <>
      <circle cx="8" cy="8" r="2.75" />
      <path d="M8 2.25v1.5M8 12.25v1.5M2.25 8h1.5M12.25 8h1.5M3.9 3.9l1.05 1.05M11.05 11.05l1.05 1.05M12.1 3.9l-1.05 1.05M4.95 11.05 3.9 12.1" />
    </>
  ),
  moon: <path d="M12.5 9.9A4.75 4.75 0 1 1 6.1 3.5a4.25 4.25 0 0 0 6.4 6.4z" />,
  study: (
    <>
      <path d="M2.75 4.75 8 3.25l5.25 1.5v7.5L8 11.25l-5.25 1.5z" />
      <path d="M8 3.25v8" />
    </>
  ),
  refresh: (
    <>
      <path d="M12.75 8A4.75 4.75 0 1 1 10.6 3.9" />
      <path d="M12.75 2.5v3.5H9.25" />
    </>
  ),
  check: <path d="m3.5 8.5 3 3 6-6.5" />,
  copy: (
    <>
      <rect x="5.25" y="5.25" width="7" height="7.5" rx="1.25" />
      <path d="M10.5 5.25v-1A1.25 1.25 0 0 0 9.25 3H4.25A1.25 1.25 0 0 0 3 4.25v5A1.25 1.25 0 0 0 4.25 10.5h1" />
    </>
  ),
  send: (
    <>
      <path d="M2.75 8 13.25 3.75 8.75 13.25l-.9-4.2z" />
      <path d="M7.85 9.05 13.25 3.75" />
    </>
  ),
  paperclip: (
    <path d="M9.8 4.6 5.2 9.2a2.4 2.4 0 0 0 3.4 3.4l5-5a3.4 3.4 0 0 0-4.8-4.8l-5.1 5.1" />
  ),
  file: (
    <>
      <path d="M4.75 2.75h4.5l3 3v7.5H4.75z" />
      <path d="M9.25 2.75v3h3" />
    </>
  ),
  image: (
    <>
      <rect x="2.75" y="3.75" width="10.5" height="8.5" rx="1.25" />
      <circle cx="6.25" cy="7" r="1" />
      <path d="m3.25 10.75 3-2.5 2 1.6 1.5-1.3 2.5 1.9" />
    </>
  ),
  download: (
    <>
      <path d="M8 2.75v6.5" />
      <path d="M5 6.75 8 9.75l3-3" />
      <path d="M3.25 12.75h9.5" />
    </>
  ),
  pencil: (
    <>
      <path d="m9.75 3.75 2.5 2.5-6 6H3.75V9.75z" />
      <path d="m8.6 4.9 2.5 2.5" />
    </>
  ),
  warn: (
    <>
      <path d="M8 2.75 14 13.25H2z" />
      <path d="M8 6.5v3.25" />
      <path d="M8 11.75v.01" />
    </>
  ),
  panelLeftOpen: (
    <>
      <rect x="2.75" y="2.75" width="10.5" height="10.5" rx="1.5" />
      <path d="M6.25 2.75v10.5M9 6.25l2 1.75-2 2" />
    </>
  ),
  panelLeftClose: (
    <>
      <rect x="2.75" y="2.75" width="10.5" height="10.5" rx="1.5" />
      <path d="M6.25 2.75v10.5M10.25 6.25l-2 1.75 2 2" />
    </>
  ),
  plusSquare: (
    <>
      <rect x="2.75" y="2.75" width="10.5" height="10.5" rx="1.5" />
      <path d="M8 5.25v5.5M5.25 8h5.5" />
    </>
  ),
  folderPlus: (
    <>
      <path d="M2.75 4.25A1.25 1.25 0 0 1 4 3h2.5l1.5 1.75H12A1.25 1.25 0 0 1 13.25 6v6A1.25 1.25 0 0 1 12 13.25H4A1.25 1.25 0 0 1 2.75 12z" />
      <path d="M8 6.75v3.5M6.25 8.5h3.5" />
    </>
  ),
  trash2: (
    <>
      <path d="M3.25 4.25h9.5M5.75 4.25V3a1 1 0 0 1 1-1h2.5a1 1 0 0 1 1 1v1.25M4.25 4.25l.5 8.25a1.25 1.25 0 0 0 1.25 1.25h4a1.25 1.25 0 0 0 1.25-1.25l.5-8.25" />
      <path d="M6.5 6.75v4.5M9.5 6.75v4.5" />
    </>
  ),
  moreHorizontal: (
    <>
      <circle cx="3.5" cy="8" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="12.5" cy="8" r="1.25" fill="currentColor" stroke="none" />
    </>
  ),
  checkCircle2: (
    <>
      <circle cx="8" cy="8" r="5.75" />
      <path d="m5.25 8 2 2 3.5-3.5" />
    </>
  ),
  alertTriangle: (
    <>
      <path d="M8 2.25 13.75 12.5A1 1 0 0 1 12.88 14H3.12a1 1 0 0 1-.87-1.5z" />
      <path d="M8 6v3.5M8 11.5v.01" />
    </>
  ),
  circle: <circle cx="8" cy="8" r="5.75" />,
  bot: (
    <>
      <rect x="3.75" y="4.75" width="8.5" height="7.5" rx="1.5" />
      <path d="M8 2.5v2.25M2.5 8.5h1.25M12.25 8.5h1.25M6 7.5v.01M10 7.5v.01M5.75 10h4.5" />
    </>
  ),
  sparkles: (
    <>
      <path d="m8 2.25 1.25 3.5L12.75 7 9.25 8.25 8 11.75 6.75 8.25 3.25 7l3.5-1.25z" />
      <path d="m12.25 2.25.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5z" />
    </>
  ),
  brain: (
    <>
      <path d="M6 3.75a2.25 2.25 0 0 0-2.25 2.25c0 .38.15.75.4 1A2.25 2.25 0 0 0 3.25 9c0 1 .65 1.85 1.55 2.15A2.25 2.25 0 0 0 7 13h1V3.75z" />
      <path d="M10 3.75a2.25 2.25 0 0 1 2.25 2.25c0 .38-.15.75-.4 1A2.25 2.25 0 0 1 12.75 9c0 1-.65 1.85-1.55 2.15A2.25 2.25 0 0 1 9 13H8V3.75z" />
    </>
  ),
  lightbulb: (
    <>
      <path d="M5.5 9A4.25 4.25 0 1 1 10.5 9c-.6.75-1 1.5-1 2.25h-3C6.5 10.5 6.1 9.75 5.5 9z" />
      <path d="M6.25 13.25h3.5" />
    </>
  ),
  refreshCw: (
    <>
      <path d="M12.75 3.25v3.5H9.25" />
      <path d="M3.25 12.75v-3.5h3.5" />
      <path d="M12.5 6.75A5 5 0 0 0 4.2 4.2L3.25 5.2M3.5 9.25a5 5 0 0 0 8.3 2.55l.95-.95" />
    </>
  ),
  rotateCw: (
    <>
      <path d="M12.75 3.25v3.5H9.25" />
      <path d="M12.5 6.75A5 5 0 1 0 13 8" />
    </>
  ),
  maximize2: (
    <>
      <path d="M10.25 2.75h3v3M5.75 13.25h-3v-3M13.25 2.75l-4.5 4.5M2.75 13.25l4.5-4.5" />
    </>
  ),
  minimize2: (
    <>
      <path d="M3.25 7.25h3v-3M12.75 8.75h-3v3M6.25 7.25l-4.5-4.5M9.75 8.75l4.5 4.5" />
    </>
  ),
  fileText: (
    <>
      <path d="M4.75 2.75h4.5l3 3v7.5H4.75z" />
      <path d="M9.25 2.75v3h3M6.75 7.25h2.5M6.75 9.75h2.5" />
    </>
  ),
  archive: (
    <>
      <rect x="2.75" y="2.75" width="10.5" height="3" rx="1" />
      <path d="M3.75 5.75v6.5a1 1 0 0 0 1 1h6.5a1 1 0 0 0 1-1v-6.5M6.5 8.5h3" />
    </>
  ),
  fileSpreadsheet: (
    <>
      <path d="M4.75 2.75h4.5l3 3v7.5H4.75z" />
      <path d="M9.25 2.75v3h3M6.25 7.25h3.5M6.25 9.75h3.5M8 7.25v5" />
    </>
  ),
  fileDown: (
    <>
      <path d="M4.75 2.75h4.5l3 3v7.5H4.75z" />
      <path d="M9.25 2.75v3h3M8 6.5v4M6.25 9 8 10.75l1.75-1.75" />
    </>
  ),
  code2: (
    <>
      <path d="m5.25 5.25-2.5 2.75 2.5 2.75M10.75 5.25l2.5 2.75-2.5 2.75" />
    </>
  ),
  eye: (
    <>
      <path d="M2.25 8s2.25-4.25 5.75-4.25S13.75 8 13.75 8s-2.25 4.25-5.75 4.25S2.25 8 2.25 8z" />
      <circle cx="8" cy="8" r="1.75" />
    </>
  ),
  keyRound: (
    <>
      <circle cx="5.75" cy="8" r="3" />
      <path d="M8.75 8h4.5M11.25 8v2M13.25 8v1.5" />
    </>
  ),
  arrowUp: <path d="M8 12.75v-9.5M4.25 6.5 8 2.75l3.75 3.75" />,
  arrowDown: <path d="M8 3.25v9.5M4.25 9.5 8 13.25l3.75-3.75" />,
  bookOpen: (
    <>
      <path d="M2.75 3.75 8 2.75l5.25 1v9.5L8 12.25l-5.25 1z" />
      <path d="M8 2.75v9.5" />
    </>
  ),
  activity: <path d="M2.25 8h2.5l1.5-3.75 2.5 7.5 1.5-3.75h3.5" />,
  x: (
    <>
      <path d="m4.25 4.25 7.5 7.5" />
      <path d="M11.75 4.25l-7.5 7.5" />
    </>
  ),
};

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      className={cn("shrink-0", className)}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
