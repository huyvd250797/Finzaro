import Link from "next/link";
import { Archive, Shapes, X } from "lucide-react";
import { AuthMessage } from "@/components/auth-message";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { InstantReveal } from "@/components/instant-reveal";
import { CategoryManagerGrid } from "@/components/category-manager-grid";
import { ConfirmSubmitForm } from "@/components/confirm-submit-form";
import { CategoryIconPicker } from "@/components/category-icon-picker";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { createCategoryAction, updateCategoryAction } from "@/features/categories/actions";
import { CATEGORY_TYPE_LABELS, isCategoryType, type CategoryType } from "@/features/categories/constants";
import { categoryDepth, categoryPath, loadCategories, loadCategoryUsageCounts, type CategoryRow } from "@/features/categories/data";
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
  editing,
  usageCount = 0
}: {
  type: CategoryType;
  categories: CategoryRow[];
  editing?: CategoryRow | null;
  usageCount?: number;
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

        <ConfirmSubmitForm action={action} confirmMessage={editing && usageCount > 0 ? `Danh mục “${editing.name}” đang được sử dụng bởi ${usageCount} giao dịch. Thay đổi tên, icon hoặc màu sẽ cập nhật cách hiển thị của các giao dịch đã phát sinh; số tiền và ledger không thay đổi. Bạn có chắc muốn lưu?` : null} className="mt-5 grid gap-4 md:grid-cols-2">
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
            <CategoryIconPicker defaultValue={editing?.icon_name ?? (type === "income" ? "CircleDollarSign" : "Shapes")} defaultColor={editing?.icon_color ?? "#0d8b66"} />
          </div>

          <div className="flex justify-end gap-2 md:col-span-2">
            <Link href="/categories" data-instant-close className="inline-flex h-10 items-center rounded-xl border border-[var(--border)] px-4 text-sm font-bold">Hủy</Link>
            <PendingSubmitButton idleLabel={editing ? "Lưu thay đổi" : "Tạo danh mục"} pendingLabel={editing ? "Đang lưu..." : "Đang tạo danh mục..."} className="h-10 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white" />
          </div>
        </ConfirmSubmitForm>
      </CardContent>
    </Card>
  );
}

function CategorySection({ type, categories, showArchived, usageCounts }: { type: CategoryType; categories: CategoryRow[]; showArchived: boolean; usageCounts: Map<string, number> }) {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const visible = categories
    .filter((category) => category.category_type === type && (showArchived || !category.is_archived))
    .sort((a, b) => a.sort_order - b.sort_order || categoryDepth(a, categoryById) - categoryDepth(b, categoryById) || a.name.localeCompare(b.name, "vi"));

  const managerItems = visible.map((category) => ({
    id: category.id,
    name: category.name,
    icon_name: category.icon_name,
    icon_color: category.icon_color,
    is_system: category.is_system,
    is_archived: category.is_archived,
    sort_order: category.sort_order,
    parent_label: category.parent_id ? categoryPath(category, categoryById).split(" › ").slice(0, -1).join(" › ") || null : null
  }));

  return (
    <Card>
      <CardHeader>
        <div>
          <h2 className="font-bold">{CATEGORY_TYPE_LABELS[type]}</h2>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">{visible.length} danh mục {showArchived ? "(gồm đã lưu trữ)" : "đang hoạt động"}</p>
        </div>
        <InstantReveal label="Thêm" icon={false}><CategoryForm type={type} categories={categories} /></InstantReveal>
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted-foreground)]">Chưa có danh mục.</div>
        ) : <CategoryManagerGrid type={type} categories={managerItems} showArchived={showArchived} />}
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
  // Usage counts are only needed for the edit confirmation. Avoid scanning the
  // transaction history on the normal Category grid/reorder path.
  const usageCounts = editing ? await loadCategoryUsageCounts(supabase, userId) : new Map<string, number>();
  const showArchived = params.show === "archived";

  return (
    <div className="mx-auto max-w-[1300px] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--primary)]">Money · Classification</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Danh mục</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--muted-foreground)]">Tổ chức thu nhập và chi tiêu bằng category có cấu trúc, subcategory và icon riêng. Khi bạn xác nhận đổi tên/icon/màu, các giao dịch đã dùng danh mục đó sẽ hiển thị metadata mới; số tiền và ledger không thay đổi.</p>
        </div>
        <div className="flex gap-2">
          <Link href={showArchived ? "/categories" : "/categories?show=archived"} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3.5 text-sm font-bold">{showArchived ? <Shapes className="size-4" /> : <Archive className="size-4" />} {showArchived ? "Đang hoạt động" : "Xem đã lưu trữ"}</Link>
        </div>
      </div>

      <AuthMessage error={params.error} message={params.message} />
      {newType && <CategoryForm type={newType} categories={categories} />}
      {editing && <CategoryForm type={editing.category_type} categories={categories} editing={editing} usageCount={usageCounts.get(editing.id) ?? 0} />}

      <div className="mt-5 grid gap-4">
        <CategorySection type="expense" categories={categories} showArchived={showArchived} usageCounts={usageCounts} />
        <CategorySection type="income" categories={categories} showArchived={showArchived} usageCounts={usageCounts} />
      </div>
    </div>
  );
}
