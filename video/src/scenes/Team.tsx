import React from "react";
import { Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Logo } from "../components/Logo";
import { Reveal, Scene, WordReveal } from "../components/Motion";
import { colors, FPS, nightBackground } from "../theme";

export const TEAM_FRAMES = 18 * FPS;

const fill: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  padding: "0 160px",
};

const Member: React.FC<{ name: string; role: string }> = ({ name, role }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 22,
      padding: "22px 30px 22px 22px",
      borderRadius: 26,
      border: "1px solid rgba(255,255,255,0.14)",
      backgroundColor: "rgba(255,255,255,0.06)",
    }}
  >
    <span
      style={{
        width: 76,
        height: 76,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        background: `linear-gradient(135deg, ${colors.rose}, ${colors.violet})`,
        fontSize: 28,
        fontWeight: 800,
      }}
    >
      {name.slice(0, 1)}
    </span>
    <div>
      <div style={{ fontSize: 40, fontWeight: 800 }}>{name}</div>
      <div style={{ fontSize: 26, color: colors.muted, fontWeight: 600 }}>{role}</div>
    </div>
  </div>
);

const Claim: React.FC<{ index: number; text: string; at: number }> = ({ index, text, at }) => (
  <Reveal at={at} rise={30}>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        padding: "26px 34px",
        borderRadius: 26,
        backgroundColor: "#fff",
        color: colors.ink,
        boxShadow: "0 30px 60px -30px rgba(0,0,0,0.6)",
      }}
    >
      <span
        style={{
          width: 54,
          height: 54,
          flex: "none",
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          backgroundColor: colors.violet,
          color: "#fff",
          fontSize: 26,
          fontWeight: 800,
        }}
      >
        {index}
      </span>
      <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.02em" }}>{text}</span>
    </div>
  </Reveal>
);

export const Team: React.FC = () => {
  const frame = useCurrentFrame();
  const shotStart = 8 * FPS;
  return (
    <Scene frames={TEAM_FRAMES} background={nightBackground}>
      {/* 0 to 8s: who we are */}
      <Reveal at={0.2} until={7.8} style={fill}>
        <div style={{ color: colors.roseSoft, fontSize: 36, fontWeight: 700 }}>Who built this</div>
        <div style={{ marginTop: 12, fontSize: 104, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1 }}>
          <WordReveal text="An all-women team." at={0.4} perWord={0.13} />
        </div>
        <div style={{ marginTop: 28, maxWidth: 1350, fontSize: 46, fontWeight: 600, color: colors.muted, lineHeight: 1.3 }}>
          <WordReveal
            text="As women, we know how often women's health is an afterthought in sport. So we built for her."
            at={1.6}
            perWord={0.06}
          />
        </div>
        <Reveal at={3.6}>
          <div style={{ marginTop: 48, display: "flex", gap: 28 }}>
            <Member name="Nourin Zaman" role="Player experience and design" />
            <Member name="Ashra Rahman" role="Clinical rules and backend" />
          </div>
        </Reveal>
      </Reveal>

      {/* 8 to 13s: product reveal */}
      <Reveal at={8} until={12.9} style={{ position: "absolute", inset: 0 }}>
        <div style={{ position: "absolute", left: 160, top: 300, display: "flex", alignItems: "center", gap: 26 }}>
          <Logo size={96} />
          <span style={{ fontSize: 104, fontWeight: 800, letterSpacing: "-0.045em" }}>ComeBack</span>
        </div>
        <div style={{ position: "absolute", left: 160, top: 470, maxWidth: 640, fontSize: 46, fontWeight: 600, color: colors.muted, lineHeight: 1.3 }}>
          The ICC&apos;s six stages, turned into a guided return to cricket on any phone.
        </div>
        <Img
          src={staticFile("rec/product-review.png")}
          style={{
            position: "absolute",
            left: 1010,
            top: 210,
            width: 1180,
            borderRadius: 22,
            boxShadow: "0 50px 100px -30px rgba(0,0,0,0.75)",
            translate: `${interpolate(frame, [shotStart, shotStart + 30], [120, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.22, 1, 0.36, 1),
            })}px 0`,
          }}
        />
      </Reveal>

      {/* 13 to 18s: three promises */}
      <Reveal at={13} style={{ ...fill, gap: 22 }}>
        <div style={{ marginBottom: 14, fontSize: 64, fontWeight: 800, letterSpacing: "-0.03em" }}>Three promises</div>
        <Claim index={1} text="Follows the ICC's six stages, with page citations" at={13.4} />
        <Claim index={2} text="Camera check-ins that never leave her phone" at={14.6} />
        <Claim index={3} text="Her own clinician approves every stage" at={15.8} />
      </Reveal>
    </Scene>
  );
};
