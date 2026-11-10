/** Diagnostic-only server timing. Opt-in on staging with FINZARO_PERF_LOG=1.
 * Never logs amounts, identifiers, query payloads or other personal data.
 */
export async function measureServerOperation<T>(label: string, operation: () => PromiseLike<T>): Promise<T> {
  const start = performance.now();
  try {
    return await operation();
  } finally {
    if (process.env.FINZARO_PERF_LOG === "1") {
      console.info(`[Finzaro performance] ${label}: ${Math.round(performance.now() - start)} ms`);
    }
  }
}
