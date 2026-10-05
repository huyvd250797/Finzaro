import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle();
  const displayName = profile?.display_name || data.claims?.email?.split("@")[0] || "Bạn";

  return <AppShell displayName={displayName}>{children}</AppShell>;
}
