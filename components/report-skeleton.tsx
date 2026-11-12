/** Pure CSS placeholder: identical layout in server / client without timers or JS. */
export function ReportSkeleton({ kind = "overview" }: { kind?: "overview" | "calendar" | "analysis" }) {
  const calendar = kind === "calendar";
  return <div className="fin-route-skeleton fin-page-shell mx-auto max-w-[1180px] space-y-4 px-3 py-4 sm:px-5 lg:px-8 lg:py-7" aria-label="Đang tải dữ liệu tài chính" role="status" aria-busy="true">
    <div className="space-y-3"><div className="fin-skeleton h-3 w-28 rounded"/><div className="fin-skeleton h-8 w-52 rounded-lg"/><div className="fin-skeleton h-3 w-64 max-w-full rounded"/></div>
    {kind !== "overview" && <div className="fin-skeleton-card rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2"><div className="grid grid-cols-4 gap-2">{Array.from({length:4},(_,i)=><div key={i} className="fin-skeleton h-11 rounded-xl"/>)}</div></div>}
    {calendar ? <div className="fin-skeleton-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3"><div className="grid grid-cols-7 gap-2">{Array.from({length:35},(_,i)=><div key={i} className="fin-skeleton aspect-[.85] rounded-lg"/>)}</div></div> : <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{Array.from({length:3},(_,i)=><div key={i} className={`fin-skeleton-card rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 ${i===2?"col-span-2 sm:col-span-1":""}`}><div className="fin-skeleton h-3 w-16 rounded"/><div className="fin-skeleton mt-5 h-6 w-4/5 rounded"/><div className="fin-skeleton mt-2 h-3 w-3/5 rounded"/></div>)}</div>
      <div className="fin-skeleton-card rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"><div className="fin-skeleton h-4 w-36 rounded"/><div className="fin-skeleton mt-5 h-36 w-full rounded-xl sm:h-56"/></div>
    </>}
    <div className="fin-skeleton-card rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"><div className="fin-skeleton h-3 w-32 rounded"/><div className="mt-4 space-y-3">{Array.from({length:3},(_,i)=><div key={i} className="fin-skeleton h-11 rounded-xl"/>)}</div></div>
    <span className="sr-only">Đang tải nội dung, vui lòng đợi.</span>
  </div>;
}
