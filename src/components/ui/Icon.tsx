/* Presentational stroke icons for studio chrome. currentColor, 16×16. */

import type { ReactNode } from "react";

type IconName =
  | "menu"
  | "plus"
  | "settings"
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
      <path d="M2.5 4.5h11" />
      <path d="M2.5 8h11" />
      <path d="M2.5 11.5h11" />
    </>
  ),
  plus: (
    <>
      <path d="M8 3v10" />
      <path d="M3 8h10" />
    </>
  ),
  settings: (
    <>
      <circle cx="8" cy="8" r="2.25" />
      <path d="M8 2.5v1.5M8 12v1.5M2.5 8h1.5M12 8h1.5M3.9 3.9l1.1 1.1M11 11l1.1 1.1M12.1 3.9 11 5M5 11l-1.1 1.1" />
    </>
  ),
  chevronLeft: <path d="M10 3.5 5.5 8 10 12.5" />,
  chevronDown: <path d="M3.5 6 8 10.5 12.5 6" />,
  more: (
    <>
      <circle cx="3.5" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="12.5" cy="8" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  close: (
    <>
      <path d="M4 4l8 8" />
      <path d="M12 4l-8 8" />
    </>
  ),
  star: <path d="M8 2.5 9.7 6l3.8.4-2.9 2.6.8 3.7L8 10.8 4.6 12.7l.8-3.7L2.5 6.4 6.3 6z" />,
  sun: (
    <>
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 2.5v1.5M8 12v1.5M2.5 8h1.5M12 8h1.5M4 4l1 1M11 11l1 1M12 4l-1 1M5 11l-1 1" />
    </>
  ),
  moon: <path d="M11.5 10.2A4.6 4.6 0 0 1 6.2 3.7 4.7 4.7 0 1 0 11.5 10.2z" />,
  study: (
    <>
      <path d="M2.5 4.5 8 3l5.5 1.5v8L8 11.5 2.5 12.5z" />
      <path d="M8 3v8.5" />
    </>
  ),
  refresh: (
    <>
      <path d="M12.5 8A4.5 4.5 0 1 1 10.4 4.1" />
      <path d="M12.5 2.5V6H9" />
    </>
  ),
  check: <path d="M3.5 8.2 6.4 11l6.1-6.5" />,
  copy: (
    <>
      <rect x="5.5" y="5.5" width="7" height="8" rx="1.2" />
      <path d="M10.5 5.5V4.2A1.2 1.2 0 0 0 9.3 3H4.2A1.2 1.2 0 0 0 3 4.2v6.1A1.2 1.2 0 0 0 4.2 11.5H5.5" />
    </>
  ),
  send: (
    <>
      <path d="M2.5 8 13.5 3.5 9 13.5l-.8-4.7z" />
      <path d="M8.2 8.8 13.5 3.5" />
    </>
  ),
  paperclip: (
    <path d="M9.8 4.6 5.2 9.2a2.4 2.4 0 0 0 3.4 3.4l5-5a3.4 3.4 0 0 0-4.8-4.8l-5.1 5.1" />
  ),
  file: (
    <>
      <path d="M4.5 2.5h5L12.5 5.5v8H4.5z" />
      <path d="M9.5 2.5V5.5h3" />
    </>
  ),
  image: (
    <>
      <rect x="2.5" y="3.5" width="11" height="9" rx="1.2" />
      <circle cx="6" cy="7" r="1" />
      <path d="M2.8 11.2 6.2 8.4l2.1 1.8 1.6-1.5 3.3 2.5" />
    </>
  ),
  download: (
    <>
      <path d="M8 3v7" />
      <path d="M5 7.5 8 10.5 11 7.5" />
      <path d="M3.5 12.5h9" />
    </>
  ),
  pencil: (
    <>
      <path d="M9.5 3.5 12.5 6.5 6 13H3v-3z" />
      <path d="M8.2 4.8 11.2 7.8" />
    </>
  ),
  chevronRight: <path d="M6 3.5 10.5 8 6 12.5" />,
  warn: (
    <>
      <path d="M8 2.8 14.2 13.5H1.8z" />
      <path d="M8 6.2v3.4" />
      <path d="M8 11.4v.8" />
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
