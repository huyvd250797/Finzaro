import Link from "next/link";
import { Archive, ChevronRight, RotateCcw, Shapes, X } from "lucide-react";
import { AuthMessage } from "@/components/auth-message";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { InstantReveal } from "@/components/instant-reveal";
import { CategoryIconPicker } from "@/components/category-icon-picker";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { createCategoryAction, setCategoryArchivedAction, updateCategoryAction } from "@/features/categories/actions";
import { CATEGORY_TYPE_LABELS, isCategoryType, type CategoryType } from "@/features/categories/constants";
import { categoryDepth, categoryPath, loadCategories, type CategoryRow } from "@/features/categories/data";
import { CategoryIcon, iconColorValue } from "@/features/categories/icons";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Danh mục" };

type SearchParams = Promise<{
  new?: string;
  edit?: string;
  show?: string;
  error?: string;
  message?: string;
}>;

function CategoryForm({
  type,
  categories,
  editing
}: {
  type: CategoryType;
  categories: CategoryRow[];
  editing?: CategoryRow | null;
}) {
  const action = editing ? updateCategoryAction : createCategoryAction;
  const parentOptions = categories.filter((category) => category.category_type === type && !category.is_archived && category.id !== editing?.id && category.parent_id === null);

  return (
    <Card className="mt-5 border-emerald-500/25">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--primary)]">Category Engine</p>
            <h2 className="mt-1 text-lg font-black">{editing ? `Sửa ${editing.name}` : `Thêm danh mục ${CATEGORY_TYPE_LABELS[type].toLowerCase()}`}</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">Chọn icon riêng, màu icon và có thể đặt dưới một danh mục cha cùng loại.</p>
          </div>
          <Link href="/categories" data-instant-close aria-label="Đóng" className="grid size-9 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted-foreground)]"><X className="size-4" /></Link>
        </div>

        <form action={action} className="mt-5 grid gap-4 md:grid-cols-2">
          {editing && <input type="hidden" name="category_id" value={editing.id} />}
          {!editing && <input type="hidden" name="category_type" value={type} />}

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Tên danh mục</span>
            <input name="name" required maxLength={80} defaultValue={editing?.name ?? ""} placeholder={type === "expense" ? "VD: Cà phê" : "VD: Thu nhập dự án"} className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]" />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Danh mục cha <span className="font-medium normal-case">(không bắt buộc)</span></span>
            <select name="parent_id" defaultValue={editing?.parent_id ?? ""} className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm">
              <option value="">Danh mục cấp cao nhất</option>
              {parentOptions.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>

          <div className="md:col-span-2">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Icon</span>
            <CategoryIconPicker defaultValue={editing?.icon_name ?? (type === "income" ? "CircleDollarSign" : "Shapes")} defaultColor={editing?.icon_color ?? "emerald"} />
          </div>

          <div className="flex justify-end gap-2 md:col-span-2">
            <Link href="/categories" data-instant-close className="inline-flex h-10 items-center rounded-xl border border-[var(--border)] px-4 text-sm font-bold">Hủy</Link>
            <PendingSubmitButton idleLabel={editing ? "Lưu thay đổi" : "Tạo danh mục"} pendingLabel={editing ? "Đang lưu..." : "Đang tạo danh mục..."} className="h-10 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white" />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function CategorySection({ type, categories, showArchived }: { type: CategoryType; categories: CategoryRow[]; showArchived: boolean }) {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const visible = categories
    .filter((category) => category.category_type === type && (showArchived || !category.is_archived))
    .sort((a, b) => categoryDepth(a, categoryById) - categoryDepth(b, categoryById) || a.sort_order - b.sort_order || a.name.localeCompare(b.name, "vi"));

  return (
    <Card>
      <CardHeader>
        <div>
          <h2 className="font-bold">{CATEGORY_TYPE_LABELS[type]}</h2>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">{visible.length} danh mục {showArchived ? "(gồm đã lưu trữ)" : "đang hoạt động"}</p>
        </div>
        <InstantReveal label="Thêm" icon={false}><CategoryForm type={type} categories={categories} /></InstantReveal>
      </CardHeader>
      <CardContent className="space-y-2">
        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted-foreground)]">Chưa có danh mục.</div>
        ) : visible.map((category) => {
          const depth = categoryDepth(category, categoryById);
          return (
            <div key={category.id} className={`flex items-center gap-3 rounded-xl border border-[var(--border)] p-3 ${category.is_archived ? "opacity-55" : ""}`} style={{ marginLeft: `${Math.min(depth, 2) * 14}px` }}>
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--sidebar-accent)] text-[var(--primary)]" style={{ color: iconColorValue(category.icon_color) }}><CategoryIcon name={category.icon_name} className="size-4.5" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate text-sm font-bold">{category.name}</p>
                  {category.is_system && <span className="rounded-md bg-[var(--muted)] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-[var(--muted-foreground)]">Mặc định</span>}
                  {category.is_archived && <span className="rounded-md bg-[var(--muted)] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-[var(--muted-foreground)]">Đã lưu trữ</span>}
                </div>
                <p className="mt-0.5 truncate text-[11px] text-[var(--muted-foreground)]">{categoryPath(category, categoryById)} · {category.icon_name} · {category.icon_color ?? "#0d8b66"}</p>
              </div>
              <InstantReveal label="Sửa" icon={false} className="h-9 border border-[var(--border)] bg-[var(--card)] px-3 text-xs text-[var(--foreground)] shadow-none"><CategoryForm type={category.category_type} categories={categories} editing={category} /></InstantReveal>
              <form action={setCategoryArchivedAction}>
                <input type="hidden" name="category_id" value={category.id} />
                <input type="hidden" name="archived" value={category.is_archived ? "false" : "true"} />
                <button type="submit" title={category.is_archived ? "Khôi phục" : "Lưu trữ"} className="grid size-9 place-items-center rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]">{category.is_archived ? <RotateCcw className="size-3.5" /> : <Archive className="size-3.5" />}</button>
              </form>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default async function CategoriesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { supabase, userId } = await requireUser();
  const categories = await loadCategories(supabase, userId, true);
  const newType = params.new && isCategoryType(params.new) ? params.new : null;
  const editing = params.edit ? categories.find((category) => category.id === params.edit) ?? null : null;
  const showArchived = params.show === "archived";

  return (
    <div className="mx-auto max-w-[1300px] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--primary)]">Money · Classification</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Danh mục</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--muted-foreground)]">Tổ chức thu nhập và chi tiêu bằng category có cấu trúc, subcategory và icon riêng. Giao dịch cũ vẫn giữ snapshot tên danh mục để bảo toàn lịch sử.</p>
        </div>
        <div className="flex gap-2">
          <Link href={showArchived ? "/categories" : "/categories?show=archived"} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3.5 text-sm font-bold">{showArchived ? <Shapes className="size-4" /> : <Archive className="size-4" />} {showArchived ? "Đang hoạt động" : "Xem đã lưu trữ"}</Link>
          <Link href="/transactions" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--foreground)] px-3.5 text-sm font-bold text-[var(--background)]">Giao dịch <ChevronRight className="size-4" /></Link>
        </div>
      </div>

      <AuthMessage error={params.error} message={params.message} />
      {newType && <CategoryForm type={newType} categories={categories} />}
      {editing && <CategoryForm type={editing.category_type} categories={categories} editing={editing} />}

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <CategorySection type="expense" categories={categories} showArchived={showArchived} />
        <CategorySection type="income" categories={categories} showArchived={showArchived} />
      </div>
    </div>
  );
}
