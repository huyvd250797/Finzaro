export default function ReportsLoading() {
  return (
    <div className="mx-auto max-w-[1180px] px-3 py-5 sm:px-4 md:px-6 lg:px-8 lg:py-8" aria-label="Đang tải báo cáo">
      <div className="mx-auto h-8 w-36 animate-pulse rounded-xl bg-[var(--muted)]" />
      <div className="mx-auto mt-5 h-12 max-w-3xl animate-pulse rounded-2xl bg-[var(--muted)]" />
      <div className="mx-auto mt-4 h-14 max-w-3xl animate-pulse rounded-2xl bg-[var(--muted)]" />
      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
        {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] sm:h-24" />)}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="mx-auto aspect-square w-full max-w-[310px] animate-pulse rounded-full bg-[var(--muted)]" />
        <div className="h-72 animate-pulse rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)]" />
      </div>
    </div>
  );
}
