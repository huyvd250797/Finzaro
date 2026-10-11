"use client";

import { useMemo, useState } from "react";
import { formatMinorMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";

const SLICE_COLORS = ["#36c997", "#3b82f6", "#f59e0b", "#f43f5e", "#8b5cf6", "#06b6d4", "#84cc16", "#f97316", "#ec4899", "#14b8a6"];

export type DonutSlice = { id?: string; label: string; amount: number; percent: number };

export function reportSliceColor(index: number) {
  return SLICE_COLORS[index % SLICE_COLORS.length];
}

function point(cx: number, cy: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}

function slicePath(startAngle: number, endAngle: number) {
  const cx = 120;
  const cy = 120;
  const radius = 108;
  if (endAngle - startAngle >= 359.999) {
    return `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx - 0.01} ${cy - radius} Z`;
  }
  const start = point(cx, cy, radius, startAngle);
  const end = point(cx, cy, radius, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

function labelPosition(startAngle: number, endAngle: number, percent: number) {
  const middle = startAngle + (endAngle - startAngle) / 2;
  const radius = percent >= 28 ? 58 : 70;
  return point(120, 120, radius, middle);
}

export function ReportDonut({ slices, total, currency, decimalDigits = 0, centerLabel }: { slices: DonutSlice[]; total: number; currency: string; decimalDigits?: number; centerLabel: string }) {
  const visible = useMemo(() => {
    const positive = slices.filter((slice) => slice.amount > 0);
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
  }, [slices]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = visible[Math.min(selectedIndex, Math.max(0, visible.length - 1))] ?? null;

  let cursor = 0;
  const geometry = visible.map((slice, index) => {
    const start = cursor * 3.6;
    cursor += slice.percent;
    const end = Math.min(360, cursor * 3.6);
    return { slice, index, start, end, label: labelPosition(start, end, slice.percent) };
  });

  return (
    <div className="mx-auto w-full max-w-[340px]">
      <div className="relative mx-auto aspect-square w-full max-w-[310px]">
        <svg viewBox="0 0 240 240" className="size-full overflow-visible drop-shadow-[0_14px_25px_rgba(0,0,0,.12)]" role="img" aria-label={`${centerLabel}: ${formatMinorMoney(total, currency, decimalDigits)}`}>
          <circle cx="120" cy="120" r="108" fill="var(--muted)" />
          {geometry.map(({ slice, index, start, end, label }) => {
            const active = index === selectedIndex;
            return (
              <g key={`${slice.id ?? slice.label}-${index}`}>
                <path
                  d={slicePath(start, end)}
                  fill={reportSliceColor(index)}
                  stroke="var(--card)"
                  strokeWidth={active ? 4 : 2.5}
                  className="cursor-pointer outline-none transition-[opacity,filter] duration-150 hover:brightness-105 focus:brightness-110"
                  style={{ opacity: selected && !active ? 0.76 : 1 }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${slice.label}: ${slice.percent}% · ${formatMinorMoney(slice.amount, currency, decimalDigits)}`}
                  onClick={() => setSelectedIndex(index)}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedIndex(index); } }}
                />
                {slice.percent >= 14 && (
                  <text x={label.x} y={label.y - 3} textAnchor="middle" className="pointer-events-none fill-white text-[10px] font-black [paint-order:stroke] [stroke:rgba(0,0,0,.22)] [stroke-width:1.5px]">
                    <tspan x={label.x}>{slice.label.length > 12 ? `${slice.label.slice(0, 11)}…` : slice.label}</tspan>
                    <tspan x={label.x} dy="13" className="text-[9px]">{slice.percent}%</tspan>
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {selected && (
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-3 shadow-sm" aria-live="polite">
          <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: reportSliceColor(Math.min(selectedIndex, visible.length - 1)) }} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black">{selected.label}</p>
            <p className="mt-0.5 text-[11px] font-bold text-[var(--muted-foreground)]">{selected.percent}% {centerLabel.toLocaleLowerCase("vi")}</p>
          </div>
          <p className="shrink-0 text-sm font-black tabular-nums">{formatMinorMoney(selected.amount, currency, decimalDigits)}</p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1.5">
        {visible.map((slice, index) => (
          <button key={`${slice.id ?? slice.label}-legend`} type="button" onClick={() => setSelectedIndex(index)} className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold transition", selectedIndex === index ? "bg-[var(--muted)] text-[var(--foreground)]" : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]")}>
            <span className="size-2 rounded-full" style={{ backgroundColor: reportSliceColor(index) }} />{slice.label}
          </button>
        ))}
      </div>
    </div>
  );
}
