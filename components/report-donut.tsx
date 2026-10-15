"use client";

import { useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";
import { formatMinorMoney } from "@/lib/utils";

export type DonutSlice = {
  id?: string;
  label: string;
  amount: number;
  percent: number;
  color?: string;
};

type SafeSlice = {
  id?: string;
  label: string;
  amount: number;
  percent: number;
  color: string;
};

const FALLBACK_CATEGORY_COLOR = "#0d8b66";

function safeText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function safeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function safeColor(value: unknown) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : FALLBACK_CATEGORY_COLOR;
}

function normalizeSlices(slices: DonutSlice[]): SafeSlice[] {
  return (Array.isArray(slices) ? slices : [])
    .map((slice, index) => ({
      id: typeof slice?.id === "string" ? slice.id : undefined,
      label: safeText(slice?.label, `Danh mục ${index + 1}`),
      amount: Math.max(0, safeNumber(slice?.amount)),
      percent: Math.max(0, safeNumber(slice?.percent)),
      color: safeColor(slice?.color)
    }))
    .filter((slice) => slice.amount > 0 && slice.percent > 0);
}

function gradientFor(slices: SafeSlice[]) {
  if (slices.length === 0) return "var(--muted)";
  let cursor = 0;
  const stops: string[] = [];
  for (const slice of slices) {
    const start = Math.max(0, Math.min(100, cursor));
    cursor += slice.percent;
    const end = Math.max(start, Math.min(100, cursor));
    stops.push(`${slice.color} ${start}% ${end}%`);
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
  const radius = slices[index].percent >= 32 ? 28 : 34;
  return {
    left: `${50 + Math.cos(radians) * radius}%`,
    top: `${50 + Math.sin(radians) * radius}%`
  };
}

export function ReportDonut({
  slices,
  total,
  currency,
  decimalDigits = 0,
  centerLabel
}: {
  slices: DonutSlice[];
  total: number;
  currency: string;
  decimalDigits?: number;
  centerLabel: string;
}) {
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
    <div className="mx-auto w-full max-w-[280px]">
      <div
        className="relative mx-auto aspect-square w-full max-w-[258px] cursor-pointer overflow-hidden rounded-full border border-[var(--border)]/70 shadow-[0_12px_24px_rgba(0,0,0,.12)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        style={{ background }}
        role="img"
        tabIndex={visible.length > 0 ? 0 : -1}
        aria-label={`${safeText(centerLabel, "Báo cáo")}: ${formatMinorMoney(safeNumber(total), safeText(currency, "VND"), safeNumber(decimalDigits))}. Chạm vào từng màu để xem chi tiết.`}
        onClick={selectFromPoint}
        onKeyDown={handleKey}
      >
        {visible.map((slice, index) => {
          if (slice.percent < 16) return null;
          const position = labelPosition(visible, index);
          return (
            <div
              key={`${slice.id ?? slice.label}-${index}-label`}
              className="pointer-events-none absolute max-w-[38%] -translate-x-1/2 -translate-y-1/2 text-center text-[9px] font-black leading-tight text-white [text-shadow:0_1px_4px_rgba(0,0,0,.75)] sm:text-[10px]"
              style={position}
            >
              <span className="block truncate">{slice.label}</span>
              <span className="mt-0.5 block">{slice.percent}%</span>
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="mt-2.5 grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5" aria-live="polite">
          <div className="flex min-w-0 items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: selected.color }} />
            <div className="min-w-0">
              <p className="truncate text-xs font-black">{selected.label}</p>
              <p className="text-[10px] font-bold text-[var(--muted-foreground)]">{selected.percent}%</p>
            </div>
          </div>
          <p className="shrink-0 text-xs font-black tabular-nums">{formatMinorMoney(selected.amount, safeText(currency, "VND"), safeNumber(decimalDigits))}</p>
        </div>
      )}
    </div>
  );
}
