import React from "react";
import { Sequence } from "remotion";
import { Credit, Shot } from "../components/Cinematic";
import { Logo } from "../components/Logo";
import { Reveal, Scene, WordReveal } from "../components/Motion";
import { colors, FPS, nightBackground } from "../theme";

export const IMPACT_FRAMES = 17 * FPS;

const Card: React.FC<{ title: string; body: string; at: number; accent: string }> = ({
  title,
  body,
  at,
  accent,
}) => (
  <Reveal at={at} rise={40} style={{ flex: 1 }}>
    <div
      style={{
        height: 340,
        padding: 40,
        borderRadius: 30,
        border: "1px solid rgba(255,255,255,0.14)",
        backgroundColor: "rgba(255,255,255,0.06)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        gap: 16,
      }}
    >
      <span style={{ width: 56, height: 8, borderRadius: 4, backgroundColor: accent }} />
      <div style={{ fontSize: 50, fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.03em" }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 600, color: colors.muted, lineHeight: 1.35 }}>{body}</div>
    </div>
  </Reveal>
);

export const Impact: React.FC = () => (
  <Scene frames={IMPACT_FRAMES} background={nightBackground} holdEnd>
    {/* 0 to 11.5s: why it matters */}
    <Reveal
      at={0.2}
      until={11.4}
      style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 140px", gap: 40 }}
    >
      <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: "-0.035em" }}>
        <WordReveal text="Why ComeBack, why now" at={0.3} perWord={0.1} />
      </div>
      <div style={{ display: "flex", gap: 30 }}>
        <Card
          at={0.8}
          accent={colors.violetSoft}
          title="Pilot-ready for ICC members"
          body="Built on the ICC's own 2026 guidelines, with every stage cited."
        />
        <Card
          at={4}
          accent={colors.mint}
          title="Any phone. Free. Offline."
          body="Four languages, including right-to-left Urdu. Video never leaves the phone."
        />
        <Card
          at={7.2}
          accent={colors.roseSoft}
          title="Ready for every sport"
          body="FIFA has published similar guidance, so it can grow to football, netball and beyond."
        />
      </div>
    </Reveal>

    {/* 11.5 to 17s: the close, over Bismah Maroof batting after her return */}
    <Sequence from={11.4 * FPS} name="Comeback footage">
      <Shot src="bismah-bat" frames={5.6 * FPS} grade="warm" zoom={[1.04, 1.14]} dim={0.62} />
      <Credit>Bismah Maroof batting for Pakistan v Ireland, Lahore, 2022 (PCB). She returned after becoming a mother.</Credit>
    </Sequence>
    <Reveal
      at={11.6}
      style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}
    >
      <div style={{ maxWidth: 1500, fontSize: 104, fontWeight: 800, lineHeight: 1.04, letterSpacing: "-0.045em" }}>
        <WordReveal text="Every mother deserves a way back." at={11.7} perWord={0.12} />
      </div>
      <Reveal at={13.4}>
        <div style={{ marginTop: 56, display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
          <Logo size={72} />
          <span style={{ fontSize: 64, fontWeight: 800, letterSpacing: "-0.04em" }}>ComeBack</span>
        </div>
        <div style={{ marginTop: 22, fontSize: 32, fontWeight: 700 }}>
          Built by an all-women team: Nourin Zaman and Ashra Rahman
        </div>
        <div style={{ marginTop: 12, fontSize: 28, fontWeight: 600, color: colors.roseSoft }}>
          nourinzaman2005-droid.github.io/comeback
        </div>
      </Reveal>
    </Reveal>
  </Scene>
);
