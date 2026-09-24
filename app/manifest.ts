import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ComeBack",
    short_name: "ComeBack",
    description: "Your clinician-connected return-to-play companion.",
    start_url: "/",
    display: "standalone",
    background_color: "#fffaf8",
    theme_color: "#6f315f",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
