import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Camera, Credit, Desk, LowerThird, Shot } from "../components/Cinematic";
import { WordReveal } from "../components/Motion";
import { colors, FPS, fontFamily } from "../theme";

export const TURN_FRAMES = 14 * FPS;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const out = Easing.bezier(0.22, 1, 0.36, 1);

/* The real ICC guideline pages fanned out on the desk. */
const PdfFan: React.FC<{ at: number; spread: boolean }> = ({ at, spread }) => {
  const frame = useCurrentFrame();
  const s = at * FPS;
  const p = interpolate(frame, [s, s + 26], [0, 1], { ...clamp, easing: out });
  const pages = [
    { src: "pdf/page-3.png", r: 9, x: 220 },
    { src: "pdf/page-2.png", r: 4, x: 110 },
    { src: "pdf/page-1.png", r: -3, x: 0 },
  ];
  return (
    <>
      {pages.map((page) => (
        <Img
          key={page.src}
          src={staticFile(page.src)}
          style={{
            position: "absolute",
            left: 760,
            top: 120,
            width: 600,
            borderRadius: 6,
            boxShadow: "0 40px 90px -20px rgba(0,0,0,0.8)",
            opacity: interpolate(frame, [s, s + 8], [0, 1], clamp),
            rotate: `${page.r * (spread ? p : 0.3)}deg`,
            translate: `${page.x * (spread ? p : 0)}px ${(1 - p) * 80}px`,
          }}
        />
      ))}
    </>
  );
};

export const Turn: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily, color: "#fff" }}>
      {/* 0 to 5s: the ICC publishes its guidelines (real cover) */}
      <Sequence durationInFrames={5.2 * FPS} name="Guidelines">
        <Desk />
        <Camera from={{ scale: 1.0, x: 0, y: 0 }} to={{ scale: 1.08, x: -40, y: 0 }} start={0} end={5}>
          <PdfFan at={0.1} spread />
        </Camera>
        <div style={{ position: "absolute", left: 120, top: 330, width: 560 }}>
          <div style={{ color: colors.roseSoft, fontSize: 34, fontWeight: 700, opacity: interpolate(frame, [6, 18], [0, 1], clamp) }}>
            22 June 2026
          </div>
          <div style={{ marginTop: 12, fontSize: 64, fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.03em" }}>
            <WordReveal text="The ICC publishes its first post-pregnancy guidelines." at={0.4} perWord={0.09} />
          </div>
        </div>
        <Credit>Cover: ICC Return to Play Post Pregnancy Guidelines, 2026</Credit>
      </Sequence>

      {/* 5 to 9.5s: proof it can be done, Bismah Maroof and her daughter */}
      <Sequence from={5 * FPS} durationInFrames={4.7 * FPS} name="Bismah">
        <Shot src="bismah-daughter" frames={4.7 * FPS} grade="warm" zoom={[1.02, 1.12]} dim={0.3} />
        <div
          style={{
            position: "absolute",
            left: 120,
            right: 120,
            top: 150,
            fontSize: 70,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            textShadow: "0 6px 40px rgba(0,0,0,0.8)",
          }}
        >
          <span style={{ color: colors.roseSoft }}>&ldquo;</span>
          <WordReveal text="No player should have to choose between motherhood and representing her country." at={0.2} perWord={0.075} />
          <div style={{ marginTop: 18, fontSize: 32, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
            Jay Shah, ICC Chairman
          </div>
        </div>
        <LowerThird
          at={1.6}
          until={4.6}
          name="Bismah Maroof"
          detail="Captained Pakistan at the 2022 World Cup with her baby daughter, Fatima"
        />
        <Credit>Footage: ICC Women&apos;s World Cup 2022, via Mojo Story. Quote: ICC media release, 22 June 2026</Credit>
      </Sequence>

      {/* 9.5 to 14s: but it is a PDF */}
      <Sequence from={9.5 * FPS} durationInFrames={4.5 * FPS} name="PDF">
        <Desk />
        <Camera from={{ scale: 1.1, x: 0, y: 0 }} to={{ scale: 1.0, x: 0, y: 0 }} start={0} end={4.5}>
          <PdfFan at={0} spread={false} />
          <span
            style={{
              position: "absolute",
              left: 1250,
              top: 150,
              padding: "10px 22px",
              borderRadius: 10,
              backgroundColor: "#d93a4f",
              fontSize: 40,
              fontWeight: 800,
              rotate: "6deg",
              scale: String(interpolate(frame - 9.5 * FPS, [8, 20], [0, 1], { ...clamp, easing: Easing.bezier(0.2, 1.4, 0.4, 1) })),
            }}
          >
            PDF
          </span>
        </Camera>
        <div style={{ position: "absolute", left: 120, top: 360, width: 600 }}>
          <div style={{ fontSize: 88, fontWeight: 800, letterSpacing: "-0.04em" }}>
            <WordReveal text="But it's a PDF." at={0.2} perWord={0.12} />
          </div>
          <div style={{ marginTop: 18, fontSize: 44, fontWeight: 700, color: "rgba(255,255,255,0.75)", lineHeight: 1.2 }}>
            <WordReveal text="A PDF can't guide a new mother through her recovery." at={1.2} perWord={0.07} />
          </div>
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};
