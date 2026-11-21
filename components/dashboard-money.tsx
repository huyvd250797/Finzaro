"use client";

import { useSyncExternalStore } from "react";
import { Eye, EyeOff } from "lucide-react";

const KEY = "finzaro-dashboard-privacy-v4611";
const listeners = new Set<() => void>();
let cachedHidden = false;
let initialized = false;

function readHidden() {
  if (!initialized && typeof window !== "undefined") {
    initialized = true;
    try { cachedHidden = sessionStorage.getItem(KEY) === "hidden"; } catch { cachedHidden = false; }
  }
  return cachedHidden;
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function useDashboardMoneyHidden() {
  return useSyncExternalStore(subscribe, readHidden, () => false);
}
function toggleVisibility() {
  cachedHidden = !readHidden();
  document.documentElement.dataset.finMoneyPrivacy = cachedHidden ? "hidden" : "visible";
  try { sessionStorage.setItem(KEY, cachedHidden ? "hidden" : "visible"); } catch { /* Session storage may be disabled */ }
  listeners.forEach((notify) => notify());
}

/** One privacy preference for ALL Dashboard amounts, not individual cards. */
export function DashboardMoneyToggle() {
  const hidden = useDashboardMoneyHidden();
  return <button type="button" onClick={toggleVisibility}
    aria-label={hidden ? "Hiện toàn bộ số tiền trên Dashboard" : "Ẩn toàn bộ số tiền trên Dashboard"}
    aria-pressed={hidden} title={hidden ? "Hiện số tiền Dashboard" : "Ẩn số tiền Dashboard"}
    className="grid size-11 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] transition hover:bg-[var(--muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]">
    {hidden ? <EyeOff className="size-4.5" aria-hidden="true"/> : <Eye className="size-4.5" aria-hidden="true"/>}
  </button>;
}

export function DashboardMoney({amount, className}:{amount:string;className?:string}) {
  const hidden = useDashboardMoneyHidden();
  return <span data-fin-money data-fin-masked={hidden ? "true" : undefined}
    className={className ?? "whitespace-nowrap"} aria-label={hidden ? "Số tiền đã được ẩn" : undefined}>
    {hidden ? "******" : amount}
  </span>;
}
