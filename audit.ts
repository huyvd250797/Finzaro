import type { SupabaseClient } from "@supabase/supabase-js";

export async function writeAudit(
  supabase: SupabaseClient,
  input: {
    actorUserId: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    workspaceId?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  const { error } = await supabase.from("audit_logs").insert({
    actor_user_id: input.actorUserId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    workspace_id: input.workspaceId ?? null,
    metadata: input.metadata ?? {}
  });

  if (error && process.env.NODE_ENV !== "production") {
    console.warn("Audit write failed", error.message);
  }
}
