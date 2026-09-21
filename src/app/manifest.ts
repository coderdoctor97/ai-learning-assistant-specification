import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Learning Studio",
    short_name: "Studio",
    description:
      "A local-first, model-independent AI learning studio that executes configurable teaching workflows stage by stage.",
    start_url: "/studio",
    display: "standalone",
    background_color: "#efe6dd",
    theme_color: "#a5613c",
    icons: [
      {
        src: "/brand/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
