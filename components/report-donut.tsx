"use client";

import { useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";
import { formatMinorMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { reportSliceColor } from "@/features/reports/palette";

export type DonutSlice = { id?: string; label: string; amount: number; percent: number };

type SafeSlice = { id?: string; label: string; amount: number; percent: number };


function safeText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function safeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeSlices(slices: DonutSlice[]): SafeSlice[] {
  const positive = (Array.isArray(slices) ? slices : [])
    .map((slice, index) => ({
      id: typeof slice?.id === "string" ? slice.id : undefined,
      label: safeText(slice?.label, `Danh mục ${index + 1}`),
      amount: Math.max(0, safeNumber(slice?.amount)),
      percent: Math.max(0, safeNumber(slice?.percent))
    }))
    .filter((slice) => slice.amount > 0 && slice.percent > 0);

  if (positive.length <= 10) return positive;
  const primary = positive.slice(0, 9);
  const remainder = positive.slice(9);
  return [
    ...primary,
    {
      id: "other-categories",
      label: "Khác",
      amount: remainder.reduce((sum, slice) => sum + slice.amount, 0),
      percent: Math.round(remainder.reduce((sum, slice) => sum + slice.percent, 0) * 10) / 10
    }
  ];
}

function gradientFor(slices: SafeSlice[]) {
  if (slices.length === 0) return "var(--muted)";
  let cursor = 0;
  const stops: string[] = [];
  for (let index = 0; index < slices.length; index += 1) {
    const slice = slices[index];
    const start = Math.max(0, Math.min(100, cursor));
    cursor += slice.percent;
    const end = Math.max(start, Math.min(100, cursor));
    stops.push(`${reportSliceColor(index)} ${start}% ${end}%`);
  }
  if (cursor < 100) stops.push(`var(--muted) ${Math.max(0, cursor)}% 100%`);
  return `conic-gradient(from 0deg, ${stops.join(", ")})`;
}

function indexForPercent(slices: SafeSlice[], percent: number) {
  let cursor = 0;
  for (let index = 0; index < slices.length; index += 1) {
    cursor += slices[index].percent;
    if (percent <= cursor + 0.0001) return index;
  }
  return Math.max(0, slices.length - 1);
}

function labelPosition(slices: SafeSlice[], index: number) {
  let before = 0;
  for (let i = 0; i < index; i += 1) before += slices[i].percent;
  const middle = before + slices[index].percent / 2;
  const radians = ((middle * 3.6 - 90) * Math.PI) / 180;
  const radius = slices[index].percent >= 28 ? 27 : 33;
  return {
    left: `${50 + Math.cos(radians) * radius}%`,
    top: `${50 + Math.sin(radians) * radius}%`
  };
}

export function ReportDonut({ slices, total, currency, decimalDigits = 0, centerLabel }: { slices: DonutSlice[]; total: number; currency: string; decimalDigits?: number; centerLabel: string }) {
  const visible = useMemo(() => normalizeSlices(slices), [slices]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const safeSelectedIndex = visible.length === 0 ? 0 : Math.min(Math.max(0, selectedIndex), visible.length - 1);
  const selected = visible[safeSelectedIndex] ?? null;
  const background = useMemo(() => gradientFor(visible), [visible]);

  function selectFromPoint(event: MouseEvent<HTMLDivElement>) {
    if (visible.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - (rect.left + rect.width / 2);
    const y = event.clientY - (rect.top + rect.height / 2);
    let degrees = (Math.atan2(y, x) * 180) / Math.PI + 90;
    if (degrees < 0) degrees += 360;
    setSelectedIndex(indexForPercent(visible, degrees / 3.6));
  }

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    if (visible.length === 0) return;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((current) => (Math.max(0, current) + 1) % visible.length);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((current) => (Math.max(0, current) - 1 + visible.length) % visible.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      setSelectedIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setSelectedIndex(visible.length - 1);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[340px]">
      <div
        className="relative mx-auto aspect-square w-full max-w-[310px] cursor-pointer overflow-hidden rounded-full border border-[var(--border)] shadow-[0_14px_25px_rgba(0,0,0,.12)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        style={{ background }}
        role="img"
        tabIndex={visible.length > 0 ? 0 : -1}
        aria-label={`${safeText(centerLabel, "Báo cáo")}: ${formatMinorMoney(safeNumber(total), safeText(currency, "VND"), safeNumber(decimalDigits))}. Chạm vào từng màu để xem chi tiết.`}
        onClick={selectFromPoint}
        onKeyDown={handleKey}
      >
        {visible.map((slice, index) => {
          if (slice.percent < 14) return null;
          const position = labelPosition(visible, index);
          return (
            <div
              key={`${slice.id ?? slice.label}-${index}-label`}
              className="pointer-events-none absolute max-w-[34%] -translate-x-1/2 -translate-y-1/2 text-center text-[9px] font-black leading-tight text-white [text-shadow:0_1px_3px_rgba(0,0,0,.6)] sm:text-[10px]"
              style={position}
            >
              <span className="block truncate">{slice.label}</span>
              <span className="mt-0.5 block">{slice.percent}%</span>
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-3 shadow-sm" aria-live="polite">
          <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: reportSliceColor(safeSelectedIndex) }} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black">{selected.label}</p>
            <p className="mt-0.5 text-[11px] font-bold text-[var(--muted-foreground)]">{selected.percent}% {safeText(centerLabel, "tổng").toLowerCase()}</p>
          </div>
          <p className="shrink-0 text-sm font-black tabular-nums">{formatMinorMoney(selected.amount, safeText(currency, "VND"), safeNumber(decimalDigits))}</p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1.5">
        {visible.map((slice, index) => (
          <button key={`${slice.id ?? slice.label}-legend-${index}`} type="button" onClick={() => setSelectedIndex(index)} className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold transition", safeSelectedIndex === index ? "bg-[var(--muted)] text-[var(--foreground)]" : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]")}>
            <span className="size-2 rounded-full" style={{ backgroundColor: reportSliceColor(index) }} />{slice.label}
          </button>
        ))}
      </div>
    </div>
  );
}
