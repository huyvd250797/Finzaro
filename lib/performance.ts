/** Server-only operation timings. Enable with FINZARO_PERF_LOG=1 on staging.
 * Names must be static operation labels, never user data, financial values,
 * transaction IDs, SQL arguments or request URLs.
 * Node's in-memory samples are process-local (serverless instances differ);
 * they are diagnostic p50/p95 estimates, not durable monitoring telemetry.
 */
const samples = new Map<string, number[]>();
const maxSamples = 100;
const percentile = (sorted: number[], fraction: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1))];

export function timingSummary(label: string) {
  const values = samples.get(label) ?? [];
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return { count: values.length, p50: percentile(sorted, .5), p95: percentile(sorted, .95), max: sorted[sorted.length - 1] };
}

export async function measureServerOperation<T>(label: string, operation: () => PromiseLike<T>): Promise<T> {
  const start = performance.now();
  try {
    return await operation();
  } finally {
    if (process.env.FINZARO_PERF_LOG === "1") {
      const duration = Math.round(performance.now() - start);
      const values = samples.get(label) ?? [];
      values.push(duration);
      if (values.length > maxSamples) values.shift();
      samples.set(label, values);
      const stats = timingSummary(label)!;
      console.info(`[Finzaro performance] ${label}: ${Math.round(duration)} ms (p50=${stats.p50} p95=${stats.p95} n=${stats.count})`);
    }
  }
}
