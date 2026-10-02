import React from "react";

/* Same mark as the app: a return arc with a cricket ball. */
export const Logo: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 64 64">
    <rect width="64" height="64" rx="18" fill="#5b3fd9" />
    <path
      d="M45 18.5A19 19 0 1 0 45 45.5"
      fill="none"
      stroke="#ffffff"
      strokeLinecap="round"
      strokeWidth="7"
    />
    <circle cx="45" cy="32" r="7.5" fill="#ff8db1" />
    <path
      d="M43.2 25.2c-1.1 2-1.7 4.2-1.7 6.8s.6 4.8 1.7 6.8M46.8 25.2c1.1 2 1.7 4.2 1.7 6.8s-.6 4.8-1.7 6.8"
      fill="none"
      stroke="#5b3fd9"
      strokeLinecap="round"
      strokeWidth="1.4"
    />
  </svg>
);
