import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Finzaro — Personal Finance Manager",
    short_name: "Finzaro",
    description: "Quản lý dòng tiền và tài chính cá nhân theo cách rõ ràng, hiện đại và an toàn.",
    start_url: "/overview",
    display: "standalone",
    background_color: "#f5f7f7",
    theme_color: "#0d8b66",
    orientation: "portrait-primary",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
