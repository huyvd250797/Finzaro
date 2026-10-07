import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CategoryType } from "@/features/categories/constants";

export type CategoryRow = {
  id: string;
  user_id: string;
  name: string;
  category_type: CategoryType;
  parent_id: string | null;
  icon_name: string;
  icon_color: string | null;
  system_key: string | null;
  is_system: boolean;
  is_archived: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export async function loadCategories(supabase: SupabaseClient<Database>, userId: string, includeArchived = true) {
  let query = supabase
    .from("categories")
    .select("id, user_id, name, category_type, parent_id, icon_name, icon_color, system_key, is_system, is_archived, sort_order, created_at, updated_at")
    .eq("user_id", userId)
    .order("category_type", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (!includeArchived) query = query.eq("is_archived", false);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CategoryRow[];
}

export function categoryDepth(category: CategoryRow, categoryById: Map<string, CategoryRow>) {
  let depth = 0;
  let current = category;
  const visited = new Set<string>([category.id]);
  while (current.parent_id) {
    const parent = categoryById.get(current.parent_id);
    if (!parent || visited.has(parent.id)) break;
    visited.add(parent.id);
    depth += 1;
    current = parent;
    if (depth >= 4) break;
  }
  return depth;
}

export function categoryPath(category: CategoryRow, categoryById: Map<string, CategoryRow>) {
  const parts = [category.name];
  let current = category;
  const visited = new Set<string>([category.id]);
  while (current.parent_id) {
    const parent = categoryById.get(current.parent_id);
    if (!parent || visited.has(parent.id)) break;
    visited.add(parent.id);
    parts.unshift(parent.name);
    current = parent;
  }
  return parts.join(" › ");
}
