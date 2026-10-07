import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Finzaro — Personal Finance Manager",
    short_name: "Finzaro",
    description: "Quản lý dòng tiền và tài chính cá nhân theo cách rõ ràng, hiện đại và an toàn.",
    // Always bootstrap through a public route. The installed iOS PWA has its own
    // cookie/storage context, so it must be able to show Login inside the PWA
    // instead of opening a protected dashboard route first.
    start_url: "/pwa?source=homescreen",
    scope: "/",
    display: "standalone",
    background_color: "#f4f7f6",
    theme_color: "#0b8f68",
    orientation: "portrait-primary",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/finzaro-v0012-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/finzaro-v0012-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/finzaro-v0012-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
