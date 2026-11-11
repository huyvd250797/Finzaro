"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Archive, ArrowLeft, ArrowRight, GripVertical, Pencil, RotateCcw, Search, X } from "lucide-react";
import { reorderCategoriesAction, setCategoryArchivedAction } from "@/features/categories/actions";
import type { CategoryType } from "@/features/categories/constants";
import { CategoryIcon, iconColorValue } from "@/features/categories/icons";
import { cn } from "@/lib/utils";
import { moveCategoryItem } from "@/features/categories/order";

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
type PressState = { id: string; pointerId: number; x: number; y: number; element: HTMLDivElement; timer: ReturnType<typeof setTimeout> };


export function CategoryManagerGrid({ type, categories, showArchived }: { type: CategoryType; categories: CategoryGridItem[]; showArchived: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState(categories);
  const itemsRef = useRef(categories);
  const [search, setSearch] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const draggingRef = useRef<string | null>(null);
  const dragStartRef = useRef<CategoryGridItem[]>(categories);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [message, setMessage] = useState("");
  const pressRef = useRef<PressState | null>(null);

  useEffect(() => () => { if (pressRef.current) clearTimeout(pressRef.current.timer); }, []);

  const visible = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("vi");
    return needle ? items.filter((item) => `${item.name} ${item.parent_label ?? ""}`.toLocaleLowerCase("vi").includes(needle)) : items;
  }, [items, search]);
  const canReorder = !showArchived && !search.trim() && !busy;

  function cancelPress() {
    if (pressRef.current) clearTimeout(pressRef.current.timer);
    pressRef.current = null;
  }

  async function persistOrder(next: CategoryGridItem[], previous: CategoryGridItem[]) {
    if (busyRef.current) return;
    const ids = next.filter((item) => !item.is_archived).map((item) => item.id);
    const oldIds = previous.filter((item) => !item.is_archived).map((item) => item.id);
    if (ids.join("|") === oldIds.join("|")) return;
    busyRef.current = true;
    setBusy(true);
    setMessage("Đang lưu thứ tự...");
    try {
      await reorderCategoriesAction(type, ids);
      setMessage("Đã lưu thứ tự danh mục.");
    } catch {
      // Do not leave an optimistic order on screen if the server rejected it.
      itemsRef.current = previous;
      setItems(previous);
      setMessage("Không thể lưu đủ thứ tự. Danh mục đang được tải lại để đối chiếu; vui lòng thử lại.");
      router.refresh();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function beginPress(event: ReactPointerEvent<HTMLDivElement>, id: string) {
    if (!canReorder || event.button !== 0 || (event.target as HTMLElement).closest("a,button,form,input")) return;
    cancelPress();
    const element = event.currentTarget;
    const pointerId = event.pointerId;
    const timer = setTimeout(() => {
      if (!element.isConnected) return;
      dragStartRef.current = [...itemsRef.current];
      draggingRef.current = id;
      setDragId(id);
      setMessage("Kéo vào vị trí mới rồi thả để lưu.");
      try { element.setPointerCapture(pointerId); } catch { /* A cancelled pointer is harmless. */ }
      try { navigator.vibrate?.(10); } catch { /* Vibration is optional. */ }
    }, 330);
    pressRef.current = { id, pointerId, x: event.clientX, y: event.clientY, element, timer };
  }

  function movePress(event: ReactPointerEvent<HTMLDivElement>) {
    const press = pressRef.current;
    if (!press || press.pointerId !== event.pointerId) return;
    if (!draggingRef.current) {
      if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > 9) cancelPress();
      return;
    }
    event.preventDefault();
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-category-manager-id]");
    const targetId = target?.dataset.categoryManagerId;
    const draggedId = draggingRef.current;
    if (!targetId || targetId === draggedId) return;
    const current = itemsRef.current;
    const from = current.findIndex((item) => item.id === draggedId);
    const to = current.findIndex((item) => item.id === targetId);
    if (from === -1 || to === -1 || from === to) return;
    const next = moveCategoryItem(current, from, to);
    itemsRef.current = next;
    setItems(next);
  }

  function endPress(event: ReactPointerEvent<HTMLDivElement>) {
    const press = pressRef.current;
    if (press && press.pointerId !== event.pointerId) return;
    cancelPress();
    if (!draggingRef.current) return;
    draggingRef.current = null;
    setDragId(null);
    if (press?.element.hasPointerCapture(event.pointerId)) {
      try { press.element.releasePointerCapture(event.pointerId); } catch { /* noop */ }
    }
    void persistOrder(itemsRef.current, dragStartRef.current);
  }

  function cancelDrag() {
    cancelPress();
    if (!draggingRef.current) return;
    draggingRef.current = null;
    setDragId(null);
    itemsRef.current = dragStartRef.current;
    setItems(dragStartRef.current);
    setMessage("Đã hủy sắp xếp.");
  }

  function moveWithButton(id: string, step: -1 | 1) {
    if (!canReorder) return;
    const current = itemsRef.current;
    const from = current.findIndex((item) => item.id === id);
    const to = from + step;
    if (to < 0 || to >= current.length) return;
    const next = moveCategoryItem(current, from, to);
    itemsRef.current = next;
    setItems(next);
    void persistOrder(next, current);
  }

  return <div className="min-w-0">
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <label className="relative block w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" aria-hidden="true" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Tìm danh mục..." aria-label={`Tìm danh mục ${type === "income" ? "thu" : "chi"}`} className="fin-input w-full pl-10 pr-9" />
        {search && <button type="button" onClick={() => setSearch("")} aria-label="Xóa từ khóa" className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl"><X className="size-4" /></button>}
      </label>
      {!showArchived && <p className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]"><GripVertical className="size-4" /> {search ? "Bỏ lọc để sắp xếp" : "Giữ và kéo để sắp xếp · hoặc dùng mũi tên"}</p>}
    </div>
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
      {visible.map((category) => {
        const color = iconColorValue(category.icon_color);
        const index = items.findIndex((item) => item.id === category.id);
        return <div
          key={category.id}
          data-category-manager-id={category.id}
          onPointerDown={(event) => beginPress(event, category.id)}
          onPointerMove={movePress}
          onPointerUp={endPress}
          onPointerCancel={cancelDrag}
          className={cn("fin-category-tile relative min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2.5", category.is_archived && "opacity-65", dragId === category.id && "fin-category-tile-dragging")}
          style={{ touchAction: dragId === category.id ? "none" : "pan-y" }}
        >
          <span className="absolute inset-x-0 top-0 h-1 rounded-t-2xl" style={{ backgroundColor: color }} />
          {!showArchived && <span title="Giữ để kéo danh mục" aria-hidden="true" className="absolute right-1 top-2 grid size-6 place-items-center rounded-md text-[var(--muted-foreground)] [touch-action:none]"><GripVertical className="size-4" /></span>}
          <div className="flex min-w-0 flex-col items-center text-center">
            <span className="mt-1 grid size-10 place-items-center rounded-xl bg-[var(--muted)]" style={{ color }}><CategoryIcon name={category.icon_name} className="size-5" /></span>
            <p className="mt-2 line-clamp-2 min-h-8 text-xs font-extrabold leading-4" title={category.name}>{category.name}</p>
            {category.parent_label && <p className="mt-0.5 w-full truncate text-[10px] text-[var(--muted-foreground)]" title={category.parent_label}>{category.parent_label}</p>}
            {category.is_system && <span className="mt-1 rounded-md bg-[var(--muted)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--muted-foreground)]">Mặc định</span>}
            <div className="mt-2 flex w-full items-center justify-center gap-1">
              <Link href={`/categories?edit=${encodeURIComponent(category.id)}${showArchived ? "&show=archived" : ""}`} aria-label={`Sửa danh mục ${category.name}`} title="Sửa" className="fin-category-action"><Pencil className="size-3.5" /></Link>
              <form action={setCategoryArchivedAction}><input type="hidden" name="category_id" value={category.id} /><input type="hidden" name="archived" value={category.is_archived ? "false" : "true"} /><button type="submit" aria-label={`${category.is_archived ? "Khôi phục" : "Lưu trữ"} danh mục ${category.name}`} title={category.is_archived ? "Khôi phục" : "Lưu trữ"} className="fin-category-action">{category.is_archived ? <RotateCcw className="size-3.5" /> : <Archive className="size-3.5" />}</button></form>
            </div>
            {!showArchived && <div className="mt-1 flex items-center justify-center gap-1">
              <button type="button" onClick={() => moveWithButton(category.id, -1)} disabled={!canReorder || index <= 0} title="Đưa sang trước" aria-label={`Đưa ${category.name} lên trước`} className="fin-category-action disabled:opacity-30"><ArrowLeft className="size-3.5" /></button>
              <button type="button" onClick={() => moveWithButton(category.id, 1)} disabled={!canReorder || index === items.length - 1} title="Đưa sang sau" aria-label={`Đưa ${category.name} xuống sau`} className="fin-category-action disabled:opacity-30"><ArrowRight className="size-3.5" /></button>
            </div>}
          </div>
        </div>;
      })}
    </div>
    {visible.length === 0 && <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted-foreground)]">Không tìm thấy danh mục. <button type="button" className="font-bold text-[var(--primary)] underline" onClick={() => setSearch("")}>Xóa bộ lọc</button></div>}
    <p role="status" aria-live="polite" className="mt-2 min-h-5 text-xs font-semibold text-[var(--muted-foreground)]">{busy ? "Đang đồng bộ thứ tự..." : message}</p>
  </div>;
}
