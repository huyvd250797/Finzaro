import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <AppSidebar />
      <AppHeader />
      <main className="pb-28 lg:ml-64 lg:pb-10">{children}</main>
      <MobileNav />
    </div>
  );
}
