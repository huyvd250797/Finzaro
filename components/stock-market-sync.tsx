"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

export function StockMarketSync({ enabledCount }: { enabledCount: number }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState(enabledCount > 0 ? "Sẵn sàng đồng bộ SSI Market Data" : "Chưa có mã bật tự động cập nhật giá");
  const lastRun = useRef(0);
  const loadingRef = useRef(false);

  const refresh = useCallback(async (silent = false) => {
    if (enabledCount <= 0 || loadingRef.current) return;
    const now = Date.now();
    if (silent && now - lastRun.current < 25_000) return;
    lastRun.current = now;
    loadingRef.current = true;
    if (!silent) setStatus("loading");
    try {
      const response = await fetch("/api/market/ssi/refresh", { method: "POST", cache: "no-store" });
      const body = await response.json() as { ok?: boolean; updated?: number; error?: string; configured?: boolean };
      if (!response.ok || !body.ok) throw new Error(body.error || "Không thể cập nhật giá.");
      setStatus("ok");
      setMessage(`Đã cập nhật ${body.updated ?? 0} vị thế · tự làm mới mỗi 30 giây khi trang đang mở`);
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Không thể cập nhật giá SSI.");
    } finally {
      loadingRef.current = false;
    }
  }, [enabledCount, router]);

  useEffect(() => {
    if (enabledCount <= 0) return;
    const initial = window.setTimeout(() => refresh(true), 900);
    const interval = window.setInterval(() => { if (document.visibilityState === "visible") refresh(true); }, 30_000);
    return () => { window.clearTimeout(initial); window.clearInterval(interval); };
  }, [enabledCount, refresh]);

  return <div className="flex min-w-0 flex-wrap items-center gap-3 rounded-2xl border border-sky-500/20 bg-sky-500/[.05] p-3.5">
    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-500/10 text-sky-600">{status === "error" ? <AlertTriangle className="size-4.5" /> : <Activity className="size-4.5" />}</div>
    <div className="min-w-[180px] flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-black">SSI Market Data</p><span className="fin-badge">Server-side</span></div><p className={`mt-1 text-[11px] leading-4 ${status === "error" ? "text-rose-500" : "text-[var(--muted-foreground)]"}`}>{message}</p></div>
    <button type="button" disabled={enabledCount <= 0 || status === "loading"} onClick={() => refresh(false)} className="fin-secondary-btn h-9 px-3 text-xs"><RefreshCw className={`size-3.5 ${status === "loading" ? "animate-spin" : ""}`} /> {status === "loading" ? "Đang lấy giá" : "Cập nhật giá"}</button>
    <div className="flex w-full items-start gap-2 border-t border-sky-500/15 pt-2 text-[10px] leading-4 text-[var(--muted-foreground)]"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-600" /><span>API Key/Secret chỉ nằm trên server. Đây là refresh Market Data gần realtime, không phải đặt lệnh. WebSocket push của SSI cần phiên streaming/OTP riêng.</span></div>
  </div>;
}
