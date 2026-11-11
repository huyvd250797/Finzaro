/** Pure immutable reorder for client-side optimistic category sorting. */
export function moveCategoryItem<T>(source: readonly T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || from >= source.length || to >= source.length || from === to) return [...source];
  const result = [...source];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}
