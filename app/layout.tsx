import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: { default: "Finzaro", template: "%s · Finzaro" },
  description: "Finzaro — Quản lý thu chi, tài khoản và ngân sách thường ngày dễ dàng trên điện thoại và máy tính.",
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
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f7f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1211" }
  ]
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('finzaro-theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`
          }}
        />
      </head>
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
