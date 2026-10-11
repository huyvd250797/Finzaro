/**
 * Shared Reports palette.
 *
 * IMPORTANT: this module must stay server-safe (no "use client", React hooks,
 * browser globals, or client-only dependencies). Both Server Components and
 * Client Components import these helpers, so keeping the palette here avoids
 * crossing the React Server Component boundary with executable functions.
 */
export const REPORT_SLICE_COLORS = [
  "#36c997",
  "#3b82f6",
  "#f59e0b",
  "#f43f5e",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#ec4899",
  "#14b8a6"
] as const;

export function reportSliceColor(index: number) {
  const safeIndex = Number.isFinite(index) ? Math.max(0, Math.trunc(index)) : 0;
  return REPORT_SLICE_COLORS[safeIndex % REPORT_SLICE_COLORS.length];
}
