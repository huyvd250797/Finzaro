"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { Archive, Check, Plus, RotateCcw, Search, X } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { CategoryIconPicker } from "@/components/category-icon-picker";
import { SheetFormActions } from "@/components/sheet-form-actions";
import { CategoryIcon, iconColorValue } from "@/features/categories/icons";
import { archiveCategoryInlineAction, reorderCategoriesAction, saveCategoryInlineAction } from "@/features/categories/actions";
import type { InlineCategoryInput } from "@/features/categories/actions";
import type { CategoryRow } from "@/features/categories/data";
import type { CategoryType } from "@/features/categories/constants";
import { moveCategoryItem } from "@/features/categories/order";
import { cn } from "@/lib/utils";

type Press = { id: string; pointerId: number; x: number; y: number; element: HTMLButtonElement; timer: ReturnType<typeof setTimeout> };

export function CategoryManagerGrid({ categories, initialType = "expense", initialArchived = false }: {
  categories: CategoryRow[]; initialType?: CategoryType; initialArchived?: boolean;
}) {
  const [items, setItems] = useState(categories);
  const itemsRef = useRef(categories);
  const [type, setType] = useState<CategoryType>(initialType);
  const [archived, setArchived] = useState(initialArchived);
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<CategoryRow | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [sorting, setSorting] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const draggingRef = useRef<string | null>(null);
  const pressRef = useRef<Press | null>(null);
  const cancelledClickRef = useRef(false);
  const previousOrderRef = useRef<CategoryRow[]>(categories);
  const busyRef = useRef(false);
  const beforeRectsRef = useRef<Map<string, DOMRect> | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(() => () => { if (pressRef.current) clearTimeout(pressRef.current.timer); }, []);
  useEffect(() => {
    if (!sorting) return;
    const onOutside = (event: PointerEvent) => {
      if (draggingRef.current || busyRef.current || !(event.target instanceof Element)) return;
      if (event.target.closest("[data-category-manager-id], [data-sort-done]")) return;
      setSorting(false);
      setNotice("");
    };
    document.addEventListener("pointerdown", onOutside);
    return () => document.removeEventListener("pointerdown", onOutside);
  }, [sorting]);

  const visible = useMemo(() => items.filter((item) => item.category_type === type && item.is_archived === archived)
    .filter((item) => !search.trim() || item.name.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")))
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "vi")), [items, type, archived, search]);
  // Keep the local array ordered to match the displayed order: sorting persisted IDs
  // must be the full unfiltered active group, not a filtered or archived subset.
  const parents = useMemo(() => items.filter((item) => item.category_type === type && (!item.is_archived || item.id === (typeof editor === "object" ? editor?.parent_id : null)) && item.parent_id === null && item.id !== (typeof editor === "object" ? editor?.id : null)), [items, type, editor]);
  const canDrag = !archived && !search.trim() && !reordering;

  function clearPress() {
    if (pressRef.current) clearTimeout(pressRef.current.timer);
    pressRef.current = null;
  }
  function closeSort() {
    if (draggingRef.current || busyRef.current) return;
    setSorting(false);
    setNotice("");
  }
  function changeType(next: CategoryType) {
    clearPress();
    draggingRef.current = null;
    setDragId(null);
    setSorting(false);
    setType(next);
    setSearch("");
    setNotice("");
  }
  function openEditor(category: CategoryRow | "new") {
    setFormError("");
    setEditor(category);
  }
  function replaceItem(category: CategoryRow) {
    const current = itemsRef.current;
    const next = current.some((item) => item.id === category.id)
      ? current.map((item) => item.id === category.id ? category : item)
      : [...current, category];
    itemsRef.current = next;
    setItems(next);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || editor === null) return;
    const data = new FormData(event.currentTarget);
    const input: InlineCategoryInput = {
      id: typeof editor === "object" ? editor.id : undefined,
      category_type: type,
      name: String(data.get("name") ?? "").trim(),
      icon_name: String(data.get("icon_name") ?? "Shapes"),
      icon_color: String(data.get("icon_color") ?? "#0d8b66"),
      parent_id: String(data.get("parent_id") ?? "") || null
    };
    setSaving(true);
    setFormError("");
    try {
      const result = await saveCategoryInlineAction(input);
      if (!result.ok) { setFormError(result.error); return; }
      replaceItem(result.category);
      setEditor(null);
      setNotice("Đã lưu danh mục.");
    } catch { setFormError("Không thể kết nối để lưu. Vui lòng thử lại."); }
    finally { setSaving(false); }
  }
  async function archiveSelected() {
    if (saving || editor === null || editor === "new") return;
    const nextArchived = !editor.is_archived;
    if (!window.confirm(nextArchived ? `Lưu trữ “${editor.name}”? Giao dịch cũ vẫn giữ lịch sử.` : `Khôi phục “${editor.name}”?`)) return;
    setSaving(true);
    setFormError("");
    try {
      const result = await archiveCategoryInlineAction(editor.id, nextArchived);
      if (!result.ok) { setFormError(result.error); return; }
      replaceItem(result.category);
      setEditor(null);
      setNotice(nextArchived ? "Đã lưu trữ danh mục." : "Đã khôi phục danh mục.");
    } catch { setFormError("Không thể thay đổi trạng thái. Vui lòng thử lại."); }
    finally { setSaving(false); }
  }

  function rememberRects() {
    if (!gridRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    beforeRectsRef.current = new Map(Array.from(gridRef.current.querySelectorAll<HTMLElement>("[data-category-manager-id]"))
      .map((element) => [element.dataset.categoryManagerId ?? "", element.getBoundingClientRect()]));
  }
  useLayoutEffect(() => {
    const rects = beforeRectsRef.current;
    beforeRectsRef.current = null;
    if (!rects || !gridRef.current) return;
    for (const element of gridRef.current.querySelectorAll<HTMLElement>("[data-category-manager-id]")) {
      const previous = rects.get(element.dataset.categoryManagerId ?? "");
      if (!previous || element.dataset.categoryManagerId === dragId) continue;
      const now = element.getBoundingClientRect();
      const dx = previous.left - now.left;
      const dy = previous.top - now.top;
      if (Math.abs(dx) + Math.abs(dy) < 2) continue;
      element.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }],
        { duration: 190, easing: "cubic-bezier(.2,.8,.2,1)" });
    }
  }, [items, dragId]);

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>, id: string) {
    if (!canDrag || (event.pointerType === "mouse" && event.button !== 0)) return;
    clearPress();
    const element = event.currentTarget;
    const pointerId = event.pointerId;
    const timer = setTimeout(() => {
      if (!element.isConnected) return;
      previousOrderRef.current = [...itemsRef.current];
      cancelledClickRef.current = true;
      draggingRef.current = id;
      setSorting(true);
      setDragId(id);
      setNotice("");
      try { element.setPointerCapture(pointerId); } catch { /* cancelled pointer */ }
      try { navigator.vibrate?.(12); } catch { /* vibration is optional */ }
    }, sorting ? 0 : 420);
    pressRef.current = { id, pointerId, x: event.clientX, y: event.clientY, element, timer };
  }
  function scrollNearEdge(clientY: number) {
    // During an iOS long-press, touch-action:none prevents accidental native
    // scrolling. Move the nearest scrollport when the dragged tile reaches an
    // edge, so categories beyond the viewport remain reachable.
    let scroller: HTMLElement | null = gridRef.current;
    while (scroller) {
      const overflow = window.getComputedStyle(scroller).overflowY;
      if (/(auto|scroll)/.test(overflow) && scroller.scrollHeight > scroller.clientHeight + 8) break;
      scroller = scroller.parentElement;
    }
    const rect = scroller?.getBoundingClientRect();
    const top = rect ? Math.max(rect.top, 100) : 96;
    const bottom = rect ? Math.min(rect.bottom, window.innerHeight - 104) : window.innerHeight - 104;
    const edge = 64;
    const delta = clientY < top + edge ? -18 : clientY > bottom - edge ? 18 : 0;
    if (!delta) return;
    if (scroller) scroller.scrollTop += delta;
    else window.scrollBy(0, delta);
  }
  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const press = pressRef.current;
    if (!press || press.pointerId !== event.pointerId) return;
    if (!draggingRef.current) {
      if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > 10) clearPress();
      return;
    }
    event.preventDefault();
    scrollNearEdge(event.clientY);
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-category-manager-id]");
    const targetId = target?.dataset.categoryManagerId;
    const draggingId = draggingRef.current;
    if (!targetId || targetId === draggingId) return;
    const current = [...itemsRef.current];
    const sourceIndex = current.findIndex((item) => item.id === draggingId);
    const targetIndex = current.findIndex((item) => item.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    rememberRects();
    const moved = moveCategoryItem(current, sourceIndex, targetIndex);
    // Renumber locally to keep sorting stable until the server confirms the move.
    const members = moved.filter((item) => item.category_type === type && !item.is_archived);
    const order = new Map(members.map((item, index) => [item.id, (index + 1) * 10]));
    const next = moved.map((item) => order.has(item.id) ? { ...item, sort_order: order.get(item.id)! } : item);
    itemsRef.current = next;
    setItems(next);
  }
  async function onPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const press = pressRef.current;
    if (press && press.pointerId !== event.pointerId) return;
    clearPress();
    if (!draggingRef.current) return;
    draggingRef.current = null;
    setDragId(null);
    cancelledClickRef.current = true;
    window.setTimeout(() => { cancelledClickRef.current = false; }, 0);
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    } catch { /* pointer was cancelled */ }
    const next = itemsRef.current;
    const before = previousOrderRef.current;
    const orderedIds = next.filter((item) => item.category_type === type && !item.is_archived)
      .sort((a, b) => a.sort_order - b.sort_order).map((item) => item.id);
    const previousIds = before.filter((item) => item.category_type === type && !item.is_archived)
      .sort((a, b) => a.sort_order - b.sort_order).map((item) => item.id);
    if (orderedIds.join("|") === previousIds.join("|")) return;
    busyRef.current = true;
    setReordering(true);
    setNotice("Đang lưu thứ tự...");
    try {
      await reorderCategoriesAction(type, orderedIds);
      setNotice("Đã lưu thứ tự.");
    } catch {
      itemsRef.current = before;
      setItems(before);
      setNotice("Không lưu được thứ tự. Đã hoàn tác.");
    } finally { busyRef.current = false; setReordering(false); }
  }
  function onPointerCancel() {
    clearPress();
    if (!draggingRef.current) return;
    draggingRef.current = null;
    setDragId(null);
    cancelledClickRef.current = true;
    window.setTimeout(() => { cancelledClickRef.current = false; }, 0);
    itemsRef.current = previousOrderRef.current;
    setItems(previousOrderRef.current);
  }
  async function onCardKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, category: CategoryRow) {
    if (!event.altKey || (event.key !== "ArrowLeft" && event.key !== "ArrowRight") || !canDrag || busyRef.current) return;
    event.preventDefault();
    const current = [...itemsRef.current];
    const ordered = current.filter((item) => item.category_type === type && !item.is_archived)
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "vi"));
    const index = ordered.findIndex((item) => item.id === category.id);
    const target = ordered[index + (event.key === "ArrowLeft" ? -1 : 1)];
    if (!target) return;
    rememberRects();
    const newOrder = moveCategoryItem(ordered, index, index + (event.key === "ArrowLeft" ? -1 : 1));
    const ranks = new Map(newOrder.map((item, pos) => [item.id, (pos + 1) * 10]));
    const next = current.map((item) => ranks.has(item.id) ? { ...item, sort_order: ranks.get(item.id)! } : item);
    itemsRef.current = next;
    setItems(next);
    busyRef.current = true;
    setReordering(true);
    try { await reorderCategoriesAction(type, newOrder.map((item) => item.id)); setNotice("Đã lưu thứ tự."); }
    catch { itemsRef.current = current; setItems(current); setNotice("Không lưu được thứ tự. Đã hoàn tác."); }
    finally { busyRef.current = false; setReordering(false); }
  }
  function onCardClick(category: CategoryRow) {
    if (cancelledClickRef.current) { cancelledClickRef.current = false; return; }
    if (sorting) return;
    openEditor(category);
  }
  const selected = typeof editor === "object" ? editor : null;
  const formId = `fin-inline-category-${selected?.id ?? type}`;

  return <div className="min-w-0">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div role="tablist" aria-label="Loại danh mục" className="inline-flex gap-1 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-1">
        <button type="button" role="tab" aria-selected={type === "expense"} onClick={() => changeType("expense")}
          className={cn("min-h-10 rounded-xl px-5 text-sm font-bold", type === "expense" ? "bg-[var(--primary)] text-white" : "text-[var(--muted-foreground)]")}>Chi tiêu</button>
        <button type="button" role="tab" aria-selected={type === "income"} onClick={() => changeType("income")}
          className={cn("min-h-10 rounded-xl px-5 text-sm font-bold", type === "income" ? "bg-[var(--primary)] text-white" : "text-[var(--muted-foreground)]")}>Thu nhập</button>
      </div>
      <div className="flex items-center gap-2">
        {sorting ? <button type="button" data-sort-done onClick={closeSort} disabled={reordering} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 text-sm font-bold text-white"><Check className="size-4" /> Xong</button>
          : <button type="button" onClick={() => { setArchived(!archived); setSearch(""); }} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-xs font-semibold"><Archive className="size-4" /> {archived ? "Đang dùng" : "Đã lưu trữ"}</button>}
        {!sorting && !archived && <button type="button" onClick={() => openEditor("new")} className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-[var(--primary)] px-3.5 text-sm font-bold text-white"><Plus className="size-4" /> Thêm</button>}
      </div>
    </div>
    <div className="mb-3 flex items-center justify-between gap-2">
      <label className="relative min-w-0 flex-1 sm:max-w-sm">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
        <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); if (sorting) closeSort(); }}
          aria-label="Tìm danh mục" placeholder="Tìm danh mục..." className="fin-input fin-category-manager-search w-full" />
        {search && <button type="button" onClick={() => setSearch("")} aria-label="Xóa tìm kiếm" className="absolute right-0 top-0 grid size-10 place-items-center"><X className="size-4" /></button>}
      </label>
      <span className="whitespace-nowrap text-xs text-[var(--muted-foreground)]">{visible.length} danh mục</span>
    </div>
    <div ref={gridRef} className={cn("grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6", sorting && "fin-category-sort-mode")}>
      {visible.map((category) => {
        const color = iconColorValue(category.icon_color);
        return <button key={category.id} type="button" data-category-manager-id={category.id}
          aria-label={`${category.name}${sorting ? ", kéo để đổi vị trí" : ", chạm để sửa"}; Alt + mũi tên để sắp xếp bằng bàn phím`}
          onClick={() => onCardClick(category)} onKeyDown={(event) => { void onCardKeyDown(event, category); }}
          onPointerDown={(event) => onPointerDown(event, category.id)}
          onPointerMove={onPointerMove} onPointerUp={(event) => { void onPointerUp(event); }} onPointerCancel={onPointerCancel}
          className={cn("fin-category-tile fin-category-edit-tile relative flex min-h-28 min-w-0 flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2.5 text-center", category.is_archived && "opacity-60", dragId === category.id && "fin-category-tile-dragging")}
          style={{ touchAction: sorting ? "none" : "pan-y" }}>
          <span className="absolute inset-x-0 top-0 h-1 rounded-t-2xl" style={{ backgroundColor: color }}/>
          <span className="grid size-11 place-items-center rounded-xl bg-[var(--muted)]" style={{ color }}><CategoryIcon name={category.icon_name} className="size-5"/></span>
          <span className="mt-2 line-clamp-2 min-h-8 w-full break-words text-xs font-extrabold leading-4" title={category.name}>{category.name}</span>
          {sorting && <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[var(--primary)] text-xs font-black text-white">−</span>}
        </button>;
      })}
    </div>
    {visible.length === 0 && <div className="rounded-xl border border-dashed border-[var(--border)] p-5 text-center text-sm text-[var(--muted-foreground)]">Không có danh mục.</div>}
    <p aria-live="polite" role="status" className="mt-2 min-h-5 text-xs text-[var(--muted-foreground)]">{notice}</p>

    <BottomSheet open={editor !== null} onClose={() => { if (!saving) setEditor(null); }} label={selected ? `Sửa danh mục ${selected.name}` : "Thêm danh mục"}
      panelClassName="sm:max-w-xl">
      {editor !== null && <div className="px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-2 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-black">{selected ? "Sửa danh mục" : `Thêm danh mục ${type === "income" ? "thu" : "chi"}`}</h2>
          <button type="button" aria-label="Đóng" onClick={() => { if (!saving) setEditor(null); }} className="grid size-10 place-items-center rounded-xl border border-[var(--border)]"><X className="size-4"/></button>
        </div>
        <form id={formId} key={selected?.id ?? `create-${type}`} onSubmit={(event) => { void save(event); }} className="grid gap-4">
          <label className="grid gap-1.5 text-sm font-bold">Tên danh mục
            <input name="name" required maxLength={80} defaultValue={selected?.name ?? ""} placeholder="Tên danh mục" className="fin-input w-full" />
          </label>
          <label className="grid gap-1.5 text-sm font-bold">Danh mục cha
            <select name="parent_id" defaultValue={selected?.parent_id ?? ""} className="fin-input w-full">
              <option value="">Không có</option>
              {parents.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
            </select>
          </label>
          <div><span className="mb-2 block text-sm font-bold">Icon và màu</span>
            <CategoryIconPicker key={selected?.id ?? `icon-${type}`} defaultValue={selected?.icon_name ?? (type === "income" ? "CircleDollarSign" : "Shapes")}
              defaultColor={selected?.icon_color ?? "#0d8b66"} />
          </div>
          {formError && <p role="alert" className="rounded-lg border border-rose-500/30 p-3 text-sm text-rose-500">{formError}</p>}
          <SheetFormActions className="justify-end">
            {selected && <button type="button" disabled={saving} onClick={() => { void archiveSelected(); }}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-xs font-bold">
              {selected.is_archived ? <RotateCcw className="size-4"/> : <Archive className="size-4"/>}{selected.is_archived ? "Khôi phục" : "Lưu trữ"}
            </button>}
            <button type="button" disabled={saving} onClick={() => setEditor(null)} className="min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-bold">Hủy</button>
            <button type="submit" form={formId} disabled={saving} className="min-h-11 flex-1 rounded-xl bg-[var(--primary)] px-4 text-sm font-black text-white disabled:opacity-60">{saving ? "Đang lưu..." : "Lưu thay đổi"}</button>
          </SheetFormActions>
        </form>
      </div>}
    </BottomSheet>
  </div>;
}
