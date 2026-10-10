"use client";

import { useMemo, useState } from "react";
import { Check, Palette, Search } from "lucide-react";
import {
  CATEGORY_ICON_COLOR_NAMES,
  CATEGORY_ICON_COLORS,
  CATEGORY_ICON_LABELS,
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
  const [query, setQuery] = useState("");
  const filteredIcons = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("vi");
    if (!needle) return CATEGORY_ICON_NAMES;
    return CATEGORY_ICON_NAMES.filter((iconName) => `${iconName} ${CATEGORY_ICON_LABELS[iconName]}`.toLocaleLowerCase("vi").includes(needle));
  }, [query]);

  return (
    <div className="min-w-0 space-y-4">
      <input type="hidden" name={name} value={selected} />
      <input type="hidden" name={colorName} value={selectedColor} />

      <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--card)] shadow-sm" style={{ color: selectedColor }}><CategoryIcon name={selected} className="size-5" /></span>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{CATEGORY_ICON_LABELS[selected]}</p><p className="truncate text-[11px] text-[var(--muted-foreground)]">{selected} · <span className="font-semibold uppercase">{selectedColor}</span></p></div>
      </div>

      <div><p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Màu icon</p><div className="flex min-w-0 flex-wrap items-center gap-2">
        {CATEGORY_ICON_COLOR_NAMES.map((palette) => { const value = CATEGORY_ICON_COLORS[palette]; const active = value.toLowerCase() === selectedColor.toLowerCase(); return <button key={palette} type="button" title={palette} aria-label={`Chọn màu ${palette}`} aria-pressed={active} onClick={() => setSelectedColor(value)} className={cn("relative grid size-9 shrink-0 place-items-center rounded-full border-2 transition", active ? "scale-105 border-[var(--foreground)]" : "border-transparent hover:border-[var(--border)]")} style={{ backgroundColor: value }}>{active && <Check className="size-3.5 text-white drop-shadow" />}</button>; })}
        <label className="inline-flex h-9 min-w-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 text-[11px] font-bold"><Palette className="size-3.5" /> Tùy chọn<input aria-label="Chọn màu icon tùy ý" type="color" value={selectedColor} onChange={(event) => setSelectedColor(event.target.value)} className="size-5 cursor-pointer rounded border-0 bg-transparent p-0" /></label>
      </div></div>

      <div>
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2"><div><p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Bộ icon</p><p className="mt-1 text-[10px] text-[var(--muted-foreground)]">{CATEGORY_ICON_NAMES.length} icon · tìm theo tên Việt hoặc tên Lucide</p></div><label className="relative block w-full sm:w-56"><Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm icon..." className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 text-xs outline-none focus:border-[var(--primary)]" /></label></div>
        <div className="max-h-[320px] overflow-y-auto overscroll-contain rounded-2xl border border-[var(--border)] p-2">
          <div className="grid min-w-0 grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-10">
            {filteredIcons.map((iconName) => { const active = iconName === selected; return <button key={iconName} type="button" title={`${CATEGORY_ICON_LABELS[iconName]} · ${iconName}`} aria-label={`Chọn icon ${CATEGORY_ICON_LABELS[iconName]}`} aria-pressed={active} onClick={() => setSelected(iconName)} className={cn("relative grid aspect-square min-h-10 min-w-0 place-items-center rounded-xl border transition", active ? "border-[var(--primary)] bg-[var(--sidebar-accent)] ring-2 ring-[var(--ring)]" : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--primary)]")} style={{ color: selectedColor }}><CategoryIcon name={iconName} className="size-4.5" />{active && <Check className="absolute right-1 top-1 size-2.5" />}</button>; })}
          </div>
          {filteredIcons.length === 0 && <p className="p-6 text-center text-xs text-[var(--muted-foreground)]">Không tìm thấy icon phù hợp.</p>}
        </div>
      </div>
    </div>
  );
}
