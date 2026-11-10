"use client";

import Link from "next/link";
import { useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import { formatMinorMoney } from "@/lib/utils";

export type DonutSlice = {
  id?: string;
  label: string;
  amount: number;
  percent: number;
  color?: string;
  href?: string | null;
};

type SafeSlice = {
  id?: string;
  label: string;
  amount: number;
  percent: number;
  color: string;
  href: string | null;
};

const FALLBACK_COLOR = "#0d8b66";
const safeNumber = (value: unknown) => { const numeric = Number(value); return Number.isFinite(numeric) ? numeric : 0; };
const safeText = (value: unknown, fallback: string) => typeof value === "string" && value.trim() ? value.trim() : fallback;

function normalizeSlices(slices: DonutSlice[]): SafeSlice[] {
  const valid = (Array.isArray(slices) ? slices : []).filter((s) => safeNumber(s?.amount) > 0);
  const total = valid.reduce((sum, slice) => sum + safeNumber(slice.amount), 0);
  return valid.map((slice, index) => ({
    id: typeof slice.id === "string" ? slice.id : undefined,
    label: safeText(slice.label, `Danh mục ${index + 1}`),
    amount: safeNumber(slice.amount),
    percent: total > 0 ? (safeNumber(slice.amount) / total) * 100 : 0,
    color: typeof slice.color === "string" && /^#[\da-fA-F]{6}$/.test(slice.color) ? slice.color : FALLBACK_COLOR,
    href: typeof slice.href === "string" && slice.href.startsWith("/reports/category/") ? slice.href : null
  }));
}

function backgroundFor(slices: SafeSlice[]) {
  if (!slices.length) return "var(--muted)";
  let position = 0;
  const stops = slices.map((slice) => {
    const start = position;
    position += slice.percent;
    return `${slice.color} ${start}% ${Math.min(position, 100)}%`;
  });
  return `conic-gradient(from 0deg, ${stops.join(", ")})`;
}

function sliceIndexAt(slices: SafeSlice[], percentage: number) {
  let sum = 0;
  for (let index = 0; index < slices.length; index++) {
    sum += slices[index].percent;
    if (percentage <= sum) return index;
  }
  return Math.max(0, slices.length - 1);
}

function arcPosition(slices: SafeSlice[], index: number) {
  const starting = slices.slice(0, index).reduce((sum, slice) => sum + slice.percent, 0);
  const angle = ((starting + slices[index].percent / 2) * 3.6 - 90) * Math.PI / 180;
  const radius = slices[index].percent >= 38 ? 26 : 32;
  return { left: `${50 + Math.cos(angle) * radius}%`, top: `${50 + Math.sin(angle) * radius}%` };
}

export function ReportDonut({ slices, total, currency, decimalDigits = 0, centerLabel }: {
  slices: DonutSlice[];
  total: number;
  currency: string;
  decimalDigits?: number;
  centerLabel: string;
}) {
  const values = useMemo(() => normalizeSlices(slices), [slices]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const currentIndex = Math.min(Math.max(0, selectedIndex), Math.max(0, values.length - 1));
  const selected = values[currentIndex] ?? null;
  const background = useMemo(() => backgroundFor(values), [values]);
  const money = (value: number) => formatMinorMoney(value, safeText(currency, "VND"), Math.max(0, safeNumber(decimalDigits)));

  function selectFromPoint(event: MouseEvent<HTMLDivElement>) {
    if (!values.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    const angle = (Math.atan2(y, x) * 180 / Math.PI + 450) % 360;
    setSelectedIndex(sliceIndexAt(values, angle / 3.6));
  }

  function onPieKey(event: KeyboardEvent<HTMLDivElement>) {
    if (!values.length) return;
    if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      if (event.key === "Home") setSelectedIndex(0);
      else if (event.key === "End") setSelectedIndex(values.length - 1);
      else setSelectedIndex((index) => (index + (["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1) + values.length) % values.length);
    }
  }

  return (
    <div className="report-breakdown grid min-w-0 gap-3 md:grid-cols-[210px_minmax(0,1fr)] md:items-start lg:grid-cols-[240px_minmax(0,1fr)]">
      <div className="flex flex-col items-center gap-2">
        <div
          className="relative aspect-square w-[min(56vw,214px)] cursor-pointer rounded-full border border-[var(--border)] shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] md:w-[210px] lg:w-[230px]"
          style={{ background }}
          role="group"
          tabIndex={values.length ? 0 : -1}
          aria-label={`${centerLabel}: ${money(total)}. Chạm vào màu hoặc dùng phím mũi tên để chọn danh mục.`}
          onClick={selectFromPoint}
          onKeyDown={onPieKey}
        >
          {values.map((slice, index) => slice.percent >= 23 ? (
            <div key={`${slice.id ?? slice.label}-${index}`} className="pointer-events-none absolute max-w-[44%] -translate-x-1/2 -translate-y-1/2 text-center text-[10px] font-extrabold leading-tight text-white [text-shadow:0_1px_5px_rgba(0,0,0,.9)]" style={arcPosition(values, index)}>
              <span className="block truncate">{slice.label}</span><span>{Math.round(slice.percent)}%</span>
            </div>
          ) : null)}
        </div>
        <p className="text-[11px] font-medium text-[var(--muted-foreground)]">Chạm một màu để xem chi tiết</p>
      </div>
      <div className="min-w-0">
        {selected && (
          <div className="mb-3 flex min-w-0 items-center justify-between gap-2 rounded-xl bg-[var(--muted)]/70 px-3 py-2.5" aria-live="polite">
            <div className="flex min-w-0 items-center gap-2">
              <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: selected.color }} />
              <div className="min-w-0"><p className="truncate text-xs font-extrabold">{selected.label} · {selected.percent.toFixed(1).replace(".", ",")}%</p><p className="text-xs font-bold tabular-nums">{money(selected.amount)}</p></div>
            </div>
            {selected.href && <Link href={selected.href} className="inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-[var(--card)] px-2 py-1.5 text-[11px] font-bold text-[var(--primary)]" aria-label={`Xem giao dịch thuộc ${selected.label}`}>Chi tiết<ArrowUpRight className="size-3.5"/></Link>}
          </div>
        )}
        <div className="grid max-h-[230px] grid-cols-2 gap-1.5 overflow-y-auto pr-1 [scrollbar-width:thin] md:max-h-[265px]" aria-label="Danh mục theo tỷ trọng">
          {values.map((slice, index) => (
            <button
              key={`${slice.id ?? slice.label}-${index}-legend`}
              type="button"
              onClick={() => setSelectedIndex(index)}
              aria-pressed={currentIndex === index}
              className={`min-w-0 rounded-xl border px-2 py-2 text-left transition-colors ${currentIndex === index ? "border-[var(--primary)] bg-[var(--sidebar-accent)]" : "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]"}`}
            >
              <span className="flex items-center gap-1.5"><span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: slice.color }} /><span className="min-w-0 truncate text-[11px] font-bold">{slice.label}</span></span>
              <span className="mt-1 block text-[11px] font-black tabular-nums">{slice.percent.toFixed(1).replace(".", ",")}%</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
