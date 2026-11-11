import type { CategoryRow } from "@/features/categories/data";

/** Build the adjacency index once; expand descendants in O(categories + descendants). */
export function categoryScopeIds(rootId: string, categories: CategoryRow[]) {
  const childrenByParent = new Map<string, string[]>();
  for (const row of categories) {
    if (!row.parent_id) continue;
    const children = childrenByParent.get(row.parent_id);
    if (children) children.push(row.id);
    else childrenByParent.set(row.parent_id, [row.id]);
  }
  const found = new Set<string>([rootId]);
  const queue = [rootId];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    for (const childId of childrenByParent.get(queue[cursor]) ?? []) {
      if (found.has(childId)) continue; // protect against malformed cycles
      found.add(childId);
      queue.push(childId);
    }
  }
  return [...found];
}
