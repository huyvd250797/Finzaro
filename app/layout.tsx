import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";
import { AppSplash } from "@/components/app-splash";
import { PerformanceVitals } from "@/components/performance-vitals";

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
    { media: "(prefers-color-scheme: light)", color: "#f3f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1412" }
  ]
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* Critical first-paint splash styles, independent of Tailwind and hydrated bundles. */}
        <style dangerouslySetInnerHTML={{ __html: `
          .finzaro-splash{position:fixed;inset:0;z-index:9999;display:flex;min-height:100vh;min-height:100dvh;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:#f5f7f7;color:#13201d;font-family:Arial,Helvetica,sans-serif}
          .dark .finzaro-splash{background:#0c1211;color:#eef7f3}
          .finzaro-splash-mark{display:grid;width:80px;height:80px;place-items:center;border-radius:26px;background:#fff}
          .dark .finzaro-splash-mark{background:#111a18}
          .finzaro-splash-mark svg{width:64px;height:64px}
          .finzaro-splash-loader{width:80px;height:4px;overflow:hidden;border-radius:999px;background:#879b9340}
          .finzaro-splash-loader span{display:block;height:100%;width:45%;border-radius:inherit;background:#0d8b66;animation:fin-instant-loader 1s ease-in-out infinite}
          @keyframes fin-instant-loader{from{transform:translateX(-110%)}55%{transform:translateX(95%)}to{transform:translateX(220%)}}
          @media(prefers-reduced-motion:reduce){.finzaro-splash-loader span{animation:none;width:100%}}
        ` }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('finzaro-theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`
          }}
        />
      </head>
      <body>
        <AppSplash />
        <PwaRegister />
        <PerformanceVitals />
        {children}
      </body>
    </html>
  );
}
