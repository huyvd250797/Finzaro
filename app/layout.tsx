import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";
import { AppSplash } from "@/components/app-splash";

export const metadata: Metadata = {
  title: { default: "Finzaro", template: "%s · Finzaro" },
  description: "Finzaro — Personal Finance Manager. Theo dõi dòng tiền, tài khoản và xây nền tảng cho quản lý tài chính cá nhân.",
  applicationName: "Finzaro",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Finzaro" },
  icons: {
    icon: [
      { url: "/icons/finzaro-v0012-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/finzaro-v0012-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/icons/finzaro-v0012-apple.png", sizes: "180x180", type: "image/png" }]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f7f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1211" }
  ]
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <AppSplash />
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
