import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WordLens",
    short_name: "WordLens",
    description:
      "Real-time dictionary for words you underline in red while reading.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    icons: [],
  };
}
