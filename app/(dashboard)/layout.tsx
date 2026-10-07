import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { NavigationProgress } from "@/components/navigation-progress";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, userId } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle();

  return (
    <div className="min-h-screen">
      <Suspense fallback={null}><NavigationProgress /></Suspense>
      <AppSidebar />
      <AppHeader displayName={profile?.display_name ?? undefined} email={user.email ?? undefined} />
      <main className="pb-28 lg:ml-64 lg:pb-10">{children}</main>
      <MobileNav />
    </div>
  );
}
