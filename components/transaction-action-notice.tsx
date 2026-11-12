"use client";

import { useEffect, useState } from "react";

type Status = { message: string; kind: "pending" | "success" | "error" };

export function TransactionActionNotice() {
  const [status, setStatus] = useState<Status | null>(null);
  useEffect(() => {
    const onFeedback = (event: Event) => {
      const detail = (event as CustomEvent<Status>).detail;
      if (detail?.message) setStatus(detail);
    };
    window.addEventListener("finzaro:transaction-feedback", onFeedback);
    return () => window.removeEventListener("finzaro:transaction-feedback", onFeedback);
  }, []);
  if (!status) return null;
  return <div role={status.kind === "error" ? "alert" : "status"} aria-live="polite" className={`fin-transaction-notice mt-3 rounded-xl border px-3 py-2.5 text-xs font-semibold ${status.kind === "error" ? "border-rose-500/30 text-rose-600" : status.kind === "success" ? "border-emerald-500/30 text-emerald-600" : "border-[var(--border)] text-[var(--muted-foreground)]"}`}>
    {status.message}
    <button type="button" className="ml-2 underline underline-offset-2" onClick={() => setStatus(null)} aria-label="Ẩn thông báo">Đóng</button>
  </div>;
}
