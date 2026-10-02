import { loadFont } from "@remotion/google-fonts/PlusJakartaSans";

export const { fontFamily } = loadFont("normal", {
  weights: ["500", "600", "700", "800"],
  subsets: ["latin"],
});

export const FPS = 30;

export const colors = {
  night: "#17122e",
  night2: "#241c47",
  ink: "#17142b",
  violet: "#5b3fd9",
  violetSoft: "#a993ff",
  rose: "#e5487a",
  roseSoft: "#ff8db1",
  mint: "#7fe0bd",
  amber: "#ffd27a",
  white: "#ffffff",
  muted: "rgba(255,255,255,0.68)",
  faint: "rgba(255,255,255,0.45)",
};

export const nightBackground = `radial-gradient(70% 60% at 0% 0%, rgba(124,92,255,0.55), transparent 60%), radial-gradient(60% 60% at 100% 100%, rgba(229,72,122,0.42), transparent 60%), ${colors.night}`;

export const ease = [0.22, 1, 0.36, 1] as const;
