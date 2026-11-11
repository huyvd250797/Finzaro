import { Suspense } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { NavigationProgress } from "@/components/navigation-progress";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function PersonalizedHeader({ supabase, userId, email }: { supabase: SupabaseClient<Database>; userId: string; email?: string }) {
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle();
  return <AppHeader displayName={profile?.display_name ?? undefined} email={email} />;
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, userId } = await requireUser();
  return <div className="min-h-screen">
    <Suspense fallback={null}><NavigationProgress /></Suspense>
    <AppSidebar />
    <Suspense fallback={<AppHeader email={user.email ?? undefined} />}>
      <PersonalizedHeader supabase={supabase} userId={userId} email={user.email ?? undefined} />
    </Suspense>
    <main className="pb-[calc(7rem+env(safe-area-inset-bottom))] lg:ml-64 lg:pb-10">{children}</main>
    <MobileNav />
  </div>;
}
