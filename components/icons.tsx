import type { SVGProps } from "react";
import type { TestKind } from "@/lib/pose/types";

/*
 * Movement icons drawn on the same 24px grid, 2px round stroke as Lucide,
 * so they sit naturally next to the rest of the icon set.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 24, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function SquatIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12.5" cy="3.5" r="1.5" />
      <path d="M12 6.5 10 12" />
      <path d="M11.5 8.5h5" />
      <path d="M10 12l4 3-2 5" />
      <path d="M10 12h7.5" />
      <path d="M4 21h16" />
    </Base>
  );
}

export function BalanceIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="3.5" r="1.5" />
      <path d="M12 6.5V13v7" />
      <path d="M6 10.5 12 8.5l6 2" />
      <path d="M12 13l3.5 2.5-2.5 2.5" />
      <path d="M8 21h8" />
    </Base>
  );
}

export function HopIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="3" r="1.5" />
      <path d="M12 6v5.5" />
      <path d="M8.5 8.5 12 7l3.5 1.5" />
      <path d="M12 11.5l-2.5 2.5 1 2.5M12 11.5l2.5 2.5-1 2.5" />
      <path d="M9 19.5h6M7 21.5h10" />
    </Base>
  );
}

export function BridgeIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="4" cy="17.5" r="1.5" />
      <path d="M6.5 18.5 13 13.5l4.5 2 1 4.5" />
      <path d="M13 13.5l5.5-3" />
      <path d="M2 21h20" />
    </Base>
  );
}

export const TEST_ICONS: Record<
  TestKind,
  (props: IconProps) => React.JSX.Element
> = {
  squat: SquatIcon,
  balance: BalanceIcon,
  hop: HopIcon,
  bridge: BridgeIcon,
};

/* Cricket ball seam, used as a quiet brand texture inside dark cards. */
export function SeamMotif({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="100" cy="100" r="96" stroke="currentColor" strokeWidth="2" />
      <path
        d="M70 8c-30 55-30 129 0 184M130 8c30 55 30 129 0 184"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M62 30l-9-3M58 52l-10-2M56 76l-10-1M55 100h-10M56 124l-10 1M58 148l-10 2M62 170l-9 3M138 30l9-3M142 52l10-2M144 76l10-1M145 100h10M144 124l10 1M142 148l10 2M138 170l9 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* Schematic of the recommended phone placement for camera check-ins. */
export function PlacementDiagram({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 360 220"
      fill="none"
      role="img"
      aria-label="Place the phone about 2 metres away at hip height, with your whole body in view"
    >
      <path d="M20 190h320" stroke="var(--border-strong)" strokeWidth="2" />
      {/* phone on stand */}
      <rect
        x="44"
        y="96"
        width="34"
        height="58"
        rx="7"
        fill="var(--surface)"
        stroke="var(--ink)"
        strokeWidth="2.5"
      />
      <circle cx="61" cy="104" r="2.5" fill="var(--ink)" />
      <path
        d="M61 154v36M48 190l13-14 13 14"
        stroke="var(--ink)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* field of view */}
      <path
        d="M78 112 286 40M78 112 286 186"
        stroke="var(--primary)"
        strokeWidth="1.5"
        strokeDasharray="4 6"
      />
      <path d="M78 112 286 40 286 186Z" fill="var(--primary)" opacity="0.07" />
      {/* person */}
      <g
        stroke="var(--ink)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="262" cy="64" r="10" fill="var(--surface)" />
        <path d="M262 76v52M262 88l-18 22M262 88l18 22M262 128l-12 58M262 128l12 58" />
      </g>
      {/* distance */}
      <path
        d="M66 206h196"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M66 200v12M262 200v12"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="132"
        y="196"
        width="64"
        height="20"
        rx="10"
        fill="var(--accent)"
      />
      <text
        x="164"
        y="210"
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="#fff"
        fontFamily="inherit"
      >
        about 2 m
      </text>
    </svg>
  );
}
