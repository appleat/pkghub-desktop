import type { CSSProperties } from "react";

const PATHS = {
  dashboard: "M3.5 3.5h7v7h-7zM13.5 3.5h7v4.5h-7zM13.5 11h7v9.5h-7zM3.5 13.5h7v7h-7z",
  package: "M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8",
  box: "M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8",
  folder: "M3 7.5A2.5 2.5 0 015.5 5h3.2a2 2 0 011.6.8L11.5 7.5h7A2.5 2.5 0 0121 10v7.5A2.5 2.5 0 0118.5 20h-13A2.5 2.5 0 013 17.5v-10z",
  scan: "M11 4a7 7 0 100 14 7 7 0 000-14zM20.5 20.5L16 16M8.5 11h5M11 8.5v5",
  search: "M11 4a7 7 0 100 14 7 7 0 000-14zM20.5 20.5L16 16",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  refresh: "M20.5 12a8.5 8.5 0 11-2.6-6.1M20.5 3.5v6h-6",
  grid: "M3.5 3.5h7v7h-7zM13.5 3.5h7v7h-7zM3.5 13.5h7v7h-7zM13.5 13.5h7v7h-7z",
  list: "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",
  star: "M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.7l5.8-.8z",
  trash: "M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13",
  edit: "M12 20h9M16.6 3.4a2.1 2.1 0 013 3L7.5 18.5 3 20l1.5-4.5L16.6 3.4z",
  play: "M8 5.5v13l10.5-6.5z",
  external: "M14 4h6v6M20 4l-9 9M18 14v4.5A1.5 1.5 0 0116.5 20h-11A1.5 1.5 0 014 18.5v-11A1.5 1.5 0 015.5 6H10",
  more: "M6 12h.01M12 12h.01M18 12h.01",
  close: "M6 6l12 12M18 6L6 18",
  chevronRight: "M9 5.5l6.5 6.5L9 18.5",
  chevronDown: "M5.5 9L12 15.5 18.5 9",
  check: "M5 12.5l4.5 4.5L19 7",
  alert: "M12 4l8.5 15H3.5L12 4zM12 9.5v4.5M12 17h.01",
  clock: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 7.5V12l3 2",
  hardDrive: "M3 13l2.5-7A2 2 0 017.4 4.5h9.2A2 2 0 0118.5 6L21 13v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4zM3 13h18M17 16.5h.01",
  sparkles: "M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3zM18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z",
  filter: "M3 5h18l-7 8.2V20l-4 1.5v-8.3L3 5z",
  tag: "M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0l-7.2-7.2a2 2 0 01-.6-1.4V4a1 1 0 011-1h8a2 2 0 011.4.6l7.4 7.4a2 2 0 010 2.8zM7.5 7.5h.01",
  layers: "M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5",
  download: "M12 3v12M7 11l5 5 5-5M4 20h16",
  info: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 11v5M12 8h.01",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 9.2a2.8 2.8 0 100 5.6 2.8 2.8 0 000-5.6z",
  arrowUp: "M12 19V5M6 11l6-6 6 6",
  code: "M9 8l-4 4 4 4M15 8l4 4-4 4",
  briefcase: "M3 8.5h18v10a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 18.5v-10zM9 8.5V6a1.5 1.5 0 011.5-1.5h3A1.5 1.5 0 0115 6v2.5M3 13h18",
  palette: "M12 3a9 9 0 100 18h1.5a2 2 0 001.6-3.2 2 2 0 011.6-3.2H19a2.5 2.5 0 002.5-2.5A9 9 0 0012 3zM7.5 10.5h.01M10 7.5h.01M14 7.5h.01M16.5 10.5h.01",
  wrench: "M15 4a5 5 0 00-4.5 7.2L4 17.7V20h2.3l6.5-6.5A5 5 0 0015 4z",
  shield: "M12 3l7.5 3v6c0 4.5-3.2 7.6-7.5 9-4.3-1.4-7.5-4.5-7.5-9V6L12 3z",
  globe: "M12 3a9 9 0 100 18 9 9 0 000-18zM3.5 9h17M3.5 15h17M12 3c2.5 2.4 3.8 5.4 3.8 9s-1.3 6.6-3.8 9c-2.5-2.4-3.8-5.4-3.8-9S9.5 5.4 12 3z",
  chat: "M21 12a8 8 0 01-8 8H8l-4 3v-4.6A8 8 0 1121 12z",
  game: "M7 8h10a5 5 0 015 5v1a4 4 0 01-7.2 2.4L13.5 15h-3l-1.3 1.4A4 4 0 012 14v-1a5 5 0 015-5zM8 11v3M6.5 12.5h3M16 12h.01M18 13.5h.01",
} as const;

export type IconName = keyof typeof PATHS;

interface Props {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
  filled?: boolean;
  strokeWidth?: number;
}

export function Icon({ name, size = 18, className, style, filled, strokeWidth = 1.7 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
