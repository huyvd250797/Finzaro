"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";

export async function logoutAction() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (userId) {
    await writeAudit(supabase, { actorUserId: userId, action: "auth.logout", entityType: "session" });
  }
  await supabase.auth.signOut();
  redirect("/login");
}
