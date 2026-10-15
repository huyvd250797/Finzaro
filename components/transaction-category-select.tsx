"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type PointerEvent as ReactPointerEvent } from "react";
import { GripVertical } from "lucide-react";
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

export function TransactionCategorySelect({
  categories,
  defaultValue,
  value,
  onValueChange
}: {
  categories: Option[];
  defaultValue?: string | null;
  value?: string;
  onValueChange?: (value: string) => void;
}) {
  const [orderedCategories, setOrderedCategories] = useState(() => sortOptions(categories));
  const orderRef = useRef(orderedCategories);
  const defaultId = defaultValue && categories.some((category) => category.id === defaultValue) ? defaultValue : categories[0]?.id ?? "";
  const [internalValue, setInternalValue] = useState(defaultId);
  const [dragId, setDragId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");
  const [, startTransition] = useTransition();
  const pressRef = useRef<PressState | null>(null);
  const suppressClickRef = useRef(false);
  const controlled = value !== undefined;
  const currentValue = controlled ? value : internalValue;
  const categoryById = useMemo(() => new Map(orderedCategories.map((category) => [category.id, category])), [orderedCategories]);

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
      <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-bold text-[var(--muted-foreground)]">
        <span>Chạm để chọn</span>
        <span className="inline-flex items-center gap-1"><GripVertical className="size-3" /> Giữ để sắp xếp</span>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Danh mục giao dịch" style={{ touchAction: dragId ? "none" : "pan-y" }}>
        {orderedCategories.map((category) => {
          const active = category.id === currentValue;
          const dragging = category.id === dragId;
          const color = iconColorValue(category.icon_color);
          return (
            <button
              key={category.id}
              type="button"
              role="radio"
              aria-checked={active}
              data-category-grid-id={category.id}
              onPointerDown={(event) => beginPress(event, category.id)}
              onPointerMove={movePress}
              onPointerUp={endPress}
              onPointerCancel={() => { clearPress(); setDragId(null); }}
              onClick={() => {
                if (suppressClickRef.current) return;
                setValue(category.id);
              }}
              className={cn(
                "relative flex min-h-[78px] min-w-0 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl border bg-[var(--card)] px-2 py-2.5 text-center transition",
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
      {saveError && <p className="mt-2 text-[10px] font-semibold text-rose-500">{saveError}</p>}
    </div>
  );
}
