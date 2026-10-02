import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return {
    name: "ComeBack",
    short_name: "ComeBack",
    description: "Your clinician-connected return-to-play companion.",
    start_url: `${basePath}/`,
    scope: `${basePath}/`,
    display: "standalone",
    background_color: "#f6f4ff",
    theme_color: "#5b3fd9",
    icons: [
      { src: `${basePath}/icon.svg`, sizes: "any", type: "image/svg+xml" },
    ],
  };
}
