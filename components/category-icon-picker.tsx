"use client";

import { useState } from "react";
import { Check, Palette } from "lucide-react";
import {
  CATEGORY_ICON_COLOR_NAMES,
  CATEGORY_ICON_COLORS,
  CATEGORY_ICON_NAMES,
  CategoryIcon,
  type CategoryIconName,
  iconColorValue
} from "@/features/categories/icons";
import { cn } from "@/lib/utils";

export function CategoryIconPicker({
  name = "icon_name",
  defaultValue = "Shapes",
  colorName = "icon_color",
  defaultColor = "#0d8b66"
}: {
  name?: string;
  defaultValue?: string;
  colorName?: string;
  defaultColor?: string;
}) {
  const initialIcon = CATEGORY_ICON_NAMES.includes(defaultValue as CategoryIconName) ? (defaultValue as CategoryIconName) : "Shapes";
  const [selected, setSelected] = useState<CategoryIconName>(initialIcon);
  const [selectedColor, setSelectedColor] = useState(iconColorValue(defaultColor));

  return (
    <div className="min-w-0 space-y-4">
      <input type="hidden" name={name} value={selected} />
      <input type="hidden" name={colorName} value={selectedColor} />

      <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--card)] shadow-sm" style={{ color: selectedColor }}>
          <CategoryIcon name={selected} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{selected}</p>
          <p className="truncate text-[11px] text-[var(--muted-foreground)]">Màu: <span className="font-semibold uppercase">{selectedColor}</span></p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Màu icon</p>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {CATEGORY_ICON_COLOR_NAMES.map((palette) => {
            const value = CATEGORY_ICON_COLORS[palette];
            const active = value.toLowerCase() === selectedColor.toLowerCase();
            return (
              <button key={palette} type="button" title={palette} aria-label={`Chọn màu ${palette}`} aria-pressed={active} onClick={() => setSelectedColor(value)} className={cn("relative grid size-9 shrink-0 place-items-center rounded-full border-2 transition", active ? "scale-105 border-[var(--foreground)]" : "border-transparent hover:border-[var(--border)]")} style={{ backgroundColor: value }}>
                {active && <Check className="size-3.5 text-white drop-shadow" />}
              </button>
            );
          })}
          <label className="inline-flex h-9 min-w-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 text-[11px] font-bold">
            <Palette className="size-3.5" /> Tùy chọn
            <input aria-label="Chọn màu icon tùy ý" type="color" value={selectedColor} onChange={(event) => setSelectedColor(event.target.value)} className="size-5 cursor-pointer rounded border-0 bg-transparent p-0" />
          </label>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Bộ icon</p>
        <div className="grid min-w-0 grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-10">
          {CATEGORY_ICON_NAMES.map((iconName) => {
            const active = iconName === selected;
            return (
              <button key={iconName} type="button" title={iconName} aria-label={`Chọn icon ${iconName}`} aria-pressed={active} onClick={() => setSelected(iconName)} className={cn("relative grid aspect-square min-h-10 min-w-0 place-items-center rounded-xl border transition", active ? "border-[var(--primary)] bg-[var(--sidebar-accent)] ring-2 ring-[var(--ring)]" : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--primary)]")} style={{ color: selectedColor }}>
                <CategoryIcon name={iconName} className="size-4.5" />
                {active && <Check className="absolute right-1 top-1 size-2.5" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
