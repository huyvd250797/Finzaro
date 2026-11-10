import type { CategoryRow } from "@/features/categories/data";
export function categoryScopeIds(rootId: string, categories: CategoryRow[]) {
  const found = new Set([rootId]);
  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift()!;
    for (const row of categories) if (row.parent_id === id && !found.has(row.id)) { found.add(row.id); queue.push(row.id); }
  }
  return [...found];
}
