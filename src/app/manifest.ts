import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Finance PWA",
    short_name: "Finance",
    description: "Quản lý thu chi và tài chính cá nhân",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f8fb",
    theme_color: "#183d6b",
    orientation: "portrait-primary",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
    ]
  };
}
