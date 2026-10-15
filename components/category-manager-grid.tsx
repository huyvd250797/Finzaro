"use client";

import Link from "next/link";
import { Archive, GripVertical, Pencil, RotateCcw } from "lucide-react";
import { useRef, useState, useTransition, type PointerEvent as ReactPointerEvent } from "react";
import { reorderCategoriesAction, setCategoryArchivedAction } from "@/features/categories/actions";
import type { CategoryType } from "@/features/categories/constants";
import { CategoryIcon, iconColorValue } from "@/features/categories/icons";
import { cn } from "@/lib/utils";

type CategoryGridItem = {
  id: string;
  name: string;
  icon_name: string;
  icon_color: string | null;
  is_system: boolean;
  is_archived: boolean;
  sort_order: number;
  parent_label: string | null;
};

type PressState = { id: string; x: number; y: number; timer: ReturnType<typeof setTimeout> };

export function CategoryManagerGrid({ type, categories, showArchived }: { type: CategoryType; categories: CategoryGridItem[]; showArchived: boolean }) {
  const [items, setItems] = useState(categories);
  const orderRef = useRef(categories);
  const [dragId, setDragId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [, startTransition] = useTransition();
  const pressRef = useRef<PressState | null>(null);

  function cancelPress() {
    if (pressRef.current) clearTimeout(pressRef.current.timer);
    pressRef.current = null;
  }

  function beginPress(event: ReactPointerEvent<HTMLDivElement>, id: string) {
    if (showArchived || event.button !== 0 || (event.target as HTMLElement).closest("a,button,form")) return;
    cancelPress();
    const timer = setTimeout(() => {
      setDragId(id);
      setMessage("");
      navigator.vibrate?.(12);
    }, 360);
    pressRef.current = { id, x: event.clientX, y: event.clientY, timer };
  }

  function movePress(event: ReactPointerEvent<HTMLDivElement>) {
    const press = pressRef.current;
    if (!press) return;
    if (!dragId) {
      if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > 9) cancelPress();
      return;
    }
    event.preventDefault();
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-category-manager-id]");
    const targetId = target?.dataset.categoryManagerId;
    if (!targetId || targetId === dragId) return;
    setItems((current) => {
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
    cancelPress();
    if (!dragId) return;
    const ids = orderRef.current.filter((item) => !item.is_archived).map((item) => item.id);
    setDragId(null);
    startTransition(async () => {
      try {
        await reorderCategoriesAction(type, ids);
        setMessage("Đã lưu thứ tự hiển thị.");
      } catch {
        setMessage("Không thể lưu thứ tự. Hãy thử lại.");
      }
    });
  }

  return (
    <div>
      {!showArchived && <div className="mb-3 flex items-center justify-end gap-1 text-[10px] font-bold text-[var(--muted-foreground)]"><GripVertical className="size-3" /> Giữ một block để kéo sắp xếp</div>}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6" style={{ touchAction: dragId ? "none" : "pan-y" }}>
        {items.map((category) => {
          const color = iconColorValue(category.icon_color);
          return (
            <div
              key={category.id}
              data-category-manager-id={category.id}
              onPointerDown={(event) => beginPress(event, category.id)}
              onPointerMove={movePress}
              onPointerUp={endPress}
              onPointerCancel={() => { cancelPress(); setDragId(null); }}
              className={cn("relative min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2.5 transition", category.is_archived && "opacity-55", dragId === category.id && "z-10 scale-[1.04] shadow-xl")}
            >
              <span className="absolute inset-x-0 top-0 h-1 rounded-t-2xl" style={{ backgroundColor: color }} />
              <div className="flex min-w-0 flex-col items-center text-center">
                <span className="mt-1 grid size-9 place-items-center rounded-xl bg-[var(--muted)]" style={{ color }}><CategoryIcon name={category.icon_name} className="size-4.5" /></span>
                <p className="mt-2 line-clamp-2 min-h-7 text-[11px] font-black leading-3.5">{category.name}</p>
                {category.parent_label && <p className="mt-0.5 w-full truncate text-[9px] text-[var(--muted-foreground)]">{category.parent_label}</p>}
                {category.is_system && <span className="mt-1 rounded-md bg-[var(--muted)] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-[var(--muted-foreground)]">Mặc định</span>}
                <div className="mt-2 flex items-center gap-1.5">
                  <Link href={`/categories?edit=${category.id}${showArchived ? "&show=archived" : ""}`} title="Sửa" className="grid size-7 place-items-center rounded-lg border border-[var(--border)] text-[var(--muted-foreground)]"><Pencil className="size-3" /></Link>
                  <form action={setCategoryArchivedAction}>
                    <input type="hidden" name="category_id" value={category.id} />
                    <input type="hidden" name="archived" value={category.is_archived ? "false" : "true"} />
                    <button type="submit" title={category.is_archived ? "Khôi phục" : "Lưu trữ"} className="grid size-7 place-items-center rounded-lg border border-[var(--border)] text-[var(--muted-foreground)]">{category.is_archived ? <RotateCcw className="size-3" /> : <Archive className="size-3" />}</button>
                  </form>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {message && <p className="mt-2 text-right text-[10px] font-semibold text-[var(--muted-foreground)]">{message}</p>}
    </div>
  );
}
