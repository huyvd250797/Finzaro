import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: { default: "Finzaro", template: "%s · Finzaro" },
  description: "Ứng dụng quản lý thu chi và tài chính cá nhân mobile-first.",
  applicationName: "Finzaro",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Finzaro" },
  formatDetection: { telephone: false },
  icons: { apple: "/icons/icon-192.png" }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f8fb" },
    { media: "(prefers-color-scheme: dark)", color: "#08111f" }
  ]
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <PwaRegister />
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
