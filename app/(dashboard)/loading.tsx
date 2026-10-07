export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-[1300px] px-4 py-6 md:px-6 lg:px-8 lg:py-8" aria-label="Đang tải">
      <div className="h-4 w-40 animate-pulse rounded bg-[var(--muted)]" />
      <div className="mt-3 h-8 w-64 animate-pulse rounded-xl bg-[var(--muted)]" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card)]" />)}
      </div>
      <div className="mt-5 h-72 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card)]" />
    </div>
  );
}
