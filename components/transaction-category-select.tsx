"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { GripVertical, Search, Star } from "lucide-react";
import { reorderCategoriesAction } from "@/features/categories/actions";
import type { CategoryType } from "@/features/categories/constants";
import { CategoryIcon, iconColorValue } from "@/features/categories/icons";
import { cn } from "@/lib/utils";

type Option = {
  id: string;
  name: string;
  icon_name: string;
  icon_color: string | null;
  parent_id: string | null;
  category_type: CategoryType;
  sort_order: number;
};

type PressState = {
  id: string;
  x: number;
  y: number;
  pointerId: number;
  timer: ReturnType<typeof setTimeout>;
  element: HTMLElement;
};

function sortOptions(categories: Option[]) {
  return [...categories].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "vi"));
}

function normalizeCategorySearch(value: string) {
  return value.toLocaleLowerCase("vi").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
}

export function TransactionCategorySelect({
  categories,
  defaultValue,
  value,
  onValueChange,
  priorityIds = [],
}: {
  categories: Option[];
  defaultValue?: string | null;
  value?: string;
  onValueChange?: (value: string) => void;
  priorityIds?: string[];
}) {
  const [orderedCategories, setOrderedCategories] = useState(() => sortOptions(categories));
  const orderRef = useRef(orderedCategories);
  const defaultId = defaultValue && categories.some((category) => category.id === defaultValue) ? defaultValue : categories[0]?.id ?? "";
  const [internalValue, setInternalValue] = useState(defaultId);
  const [dragId, setDragId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");
  const [search, setSearch] = useState("");
  const [, startTransition] = useTransition();
  const pressRef = useRef<PressState | null>(null);
  const suppressClickRef = useRef(false);
  const controlled = value !== undefined;
  const currentValue = controlled ? value : internalValue;
  const categoryById = useMemo(() => new Map(orderedCategories.map((category) => [category.id, category])), [orderedCategories]);
  const priorityCategories = useMemo(() => priorityIds.map((id) => categoryById.get(id)).filter((item): item is Option => Boolean(item)).slice(0, 6), [priorityIds, categoryById]);
  const visibleCategories = useMemo(() => {
    const query = normalizeCategorySearch(search.trim());
    return query ? orderedCategories.filter((category) => normalizeCategorySearch(`${category.name} ${category.parent_id ? categoryById.get(category.parent_id)?.name ?? "" : ""}`).includes(query)) : orderedCategories;
  }, [search, orderedCategories, categoryById]);
  const hasSelectedVisible = visibleCategories.some((category) => category.id === currentValue);

  useEffect(() => {
    const next = sortOptions(categories);
    orderRef.current = next;
    setOrderedCategories(next);
  }, [categories]);

  function label(category: Option) {
    const parent = category.parent_id ? categoryById.get(category.parent_id) : null;
    return parent ? `${parent.name} › ${category.name}` : category.name;
  }

  function setValue(next: string) {
    if (!controlled) setInternalValue(next);
    onValueChange?.(next);
  }

  function onCategoryKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, id: string) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key) || dragId) return;
    event.preventDefault();
    const index = visibleCategories.findIndex((category) => category.id === id);
    const columns = window.matchMedia('(min-width: 640px)').matches ? 4 : 3;
    const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : event.key === 'ArrowUp' ? -columns : columns;
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? visibleCategories.length - 1 : Math.max(0, Math.min(index + step, visibleCategories.length - 1));
    const next = visibleCategories[nextIndex];
    if (!next) return;
    setValue(next.id);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[data-category-grid-id]')[nextIndex]?.focus();
  }

  function clearPress() {
    if (pressRef.current) clearTimeout(pressRef.current.timer);
    pressRef.current = null;
  }

  function beginPress(event: ReactPointerEvent<HTMLElement>, id: string) {
    if (event.button !== 0) return;
    clearPress();
    const element = event.currentTarget;
    const timer = setTimeout(() => {
      suppressClickRef.current = true;
      setDragId(id);
      setSaveError("");
      try { element.setPointerCapture(event.pointerId); } catch { /* browser may release capture */ }
      navigator.vibrate?.(12);
    }, 360);
    pressRef.current = { id, x: event.clientX, y: event.clientY, pointerId: event.pointerId, timer, element };
  }

  function movePress(event: ReactPointerEvent<HTMLElement>) {
    const press = pressRef.current;
    if (!press) return;
    if (search) { clearPress(); return; }
    if (!dragId) {
      if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > 9) clearPress();
      return;
    }
    event.preventDefault();
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-category-grid-id]");
    const targetId = target?.dataset.categoryGridId;
    if (!targetId || targetId === dragId) return;
    setOrderedCategories((current) => {
      const from = current.findIndex((item) => item.id === dragId);
      const to = current.findIndex((item) => item.id === targetId);
      if (from < 0 || to < 0 || from === to) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      orderRef.current = next;
      return next;
    });
  }

  function endPress() {
    clearPress();
    if (!dragId) return;
    const nextIds = orderRef.current.map((category) => category.id);
    const categoryType = orderRef.current[0]?.category_type;
    setDragId(null);
    if (categoryType) {
      startTransition(async () => {
        try {
          await reorderCategoriesAction(categoryType, nextIds);
        } catch {
          setSaveError("Chưa lưu được thứ tự mới. Hãy thử kéo lại.");
        }
      });
    }
    setTimeout(() => { suppressClickRef.current = false; }, 0);
  }

  if (orderedCategories.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
        Chưa có danh mục hoạt động. Hãy tạo hoặc khôi phục danh mục trước.
      </div>
    );
  }

  return (
    <div>
      <input type="hidden" name="category_id" required value={currentValue} />
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
        <input type="search" aria-label="Tìm danh mục" autoComplete="off" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm nhanh danh mục..." className="fin-input min-h-10 w-full pl-9 text-sm" />
      </div>
      {priorityCategories.length > 0 && !search && <div className="mb-3 flex flex-wrap items-center gap-1.5" aria-label="Danh mục thường dùng"><span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--muted-foreground)]"><Star className="size-3" /> Thường dùng</span>{priorityCategories.map((category) => <button key={category.id} type="button" onClick={() => setValue(category.id)} aria-pressed={category.id === currentValue} className={`min-h-8 rounded-lg border px-2.5 text-[11px] font-bold ${category.id === currentValue ? "border-[var(--primary)] text-[var(--primary)]" : "border-[var(--border)]"}`}>{category.name}</button>)}</div>}
      <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-bold text-[var(--muted-foreground)]">
        <span>{search ? `${visibleCategories.length} kết quả` : "Chạm để chọn"}</span>
        {!search && <span className="inline-flex items-center gap-1"><GripVertical className="size-3" /> Giữ để sắp xếp</span>}
      </div>
      <div className="fin-category-scroll grid grid-cols-3 auto-rows-[78px] gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Danh mục giao dịch, cuộn để xem thêm" tabIndex={visibleCategories.length > 12 ? 0 : undefined} style={{ touchAction: dragId ? "none" : "pan-y" }}>
        {visibleCategories.map((category) => {
          const active = category.id === currentValue;
          const dragging = category.id === dragId;
          const color = iconColorValue(category.icon_color);
          return (
            <button
              key={category.id}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active || (!hasSelectedVisible && visibleCategories[0]?.id === category.id) ? 0 : -1}
              onKeyDown={(event) => onCategoryKeyDown(event, category.id)}
              data-category-grid-id={category.id}
              onPointerDown={(event) => { if (!search) beginPress(event, category.id); }}
              onPointerMove={movePress}
              onPointerUp={endPress}
              onPointerCancel={() => { clearPress(); setDragId(null); }}
              onClick={() => {
                if (suppressClickRef.current) return;
                setValue(category.id);
              }}
              className={cn(
                "relative flex h-[78px] min-w-0 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl border bg-[var(--card)] px-2 py-2.5 text-center transition",
                active ? "border-[var(--primary)] ring-2 ring-[var(--ring)]" : "border-[var(--border)] active:scale-[.98]",
                dragging && "z-10 scale-[1.04] opacity-90 shadow-xl"
              )}
            >
              <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} />
              <span className="grid size-8 place-items-center rounded-xl bg-[var(--muted)]" style={{ color }}><CategoryIcon name={category.icon_name} className="size-4.5" /></span>
              <span className="line-clamp-2 text-[11px] font-black leading-3.5">{label(category)}</span>
            </button>
          );
        })}
      </div>
      {visibleCategories.length === 0 && <p className="py-3 text-xs text-[var(--muted-foreground)]">Không tìm thấy danh mục phù hợp.</p>}
      {saveError && <p className="mt-2 text-[10px] font-semibold text-rose-500">{saveError}</p>}
    </div>
  );
}
