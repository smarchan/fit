import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fit",
    short_name: "Fit",
    description: "Calorías que se ajustan a tu actividad",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f6fb",
    theme_color: "#f4f6fb",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
