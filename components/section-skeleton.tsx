/** Route-level placeholders match the final module structure. They do not fetch,
 * lock scrolling, or overlay already visible financial data. */
export function SectionSkeleton({ kind = "transactions" }: { kind?: "transactions" | "accounts" | "categories" | "settings" | "statements" }) {
  const cards = kind === "accounts" ? 4 : kind === "categories" ? 9 : kind === "settings" ? 3 : kind === "statements" ? 2 : 6;
  return <section className="fin-route-skeleton fin-module-skeleton mx-auto max-w-[1180px] space-y-4 px-3 py-5 sm:px-5 lg:px-8" role="status" aria-busy="true" aria-label="Đang tải nội dung">
    <div className="space-y-3"><div className="fin-skeleton h-3 w-28 rounded"/><div className="fin-skeleton h-8 w-52 rounded-lg"/><div className="fin-skeleton h-3 w-56 max-w-full rounded"/></div>
    {kind !== "settings" && <div className="fin-skeleton-card rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3"><div className="flex gap-2"><div className="fin-skeleton h-11 flex-1 rounded-xl"/><div className="fin-skeleton h-11 flex-1 rounded-xl"/><div className="fin-skeleton h-11 w-11 rounded-xl"/></div></div>}
    <div className={kind === "categories" ? "grid grid-cols-3 gap-2 sm:grid-cols-4" : kind === "accounts" ? "grid grid-cols-1 gap-3 sm:grid-cols-2" : "space-y-2"}>
      {Array.from({length:cards},(_,i)=><div key={i} className={`fin-skeleton-card rounded-2xl border border-[var(--border)] bg-[var(--card)] ${kind === "categories" ? "p-3" : "p-4"}`}><div className="fin-skeleton h-3 w-1/3 rounded"/><div className="fin-skeleton mt-3 h-5 w-3/5 rounded"/>{kind === "categories" && <div className="fin-skeleton mt-3 size-9 rounded-full"/>}</div>)}
    </div>
    <span className="sr-only">Nội dung đang được tải.</span>
  </section>;
}
