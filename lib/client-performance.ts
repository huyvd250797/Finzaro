/** Optional UI click-to-paint timings. Enable in DevTools with:
 * sessionStorage.setItem('finzaro-perf', '1')
 * Only operation names and durations are logged; never transaction data.
 */
export function measureClientPaint(label: string, start: number) {
  if (typeof window === "undefined") return;
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
    const elapsed = Math.round(performance.now() - start);
    try {
      if (window.sessionStorage.getItem("finzaro-perf") === "1") {
        console.info(`[Finzaro performance] ${label}: ${elapsed} ms`);
      }
    } catch { /* private browsing may disable sessionStorage */ }
  }));
}
