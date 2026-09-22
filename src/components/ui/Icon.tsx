/* Presentational stroke icons for studio chrome. currentColor, 16×16.
   One design language for every glyph: 1.5 stroke, round caps/joins,
   ~2.25px canvas margin, optically centred — no per-glyph drift. */

import type { ReactNode } from "react";

type IconName =
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
  | "warn";

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
};

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      className={className}
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
