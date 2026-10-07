"use client";

import { useMemo, useState } from "react";
import { CategoryIcon, iconColorValue } from "@/features/categories/icons";

type Option = {
  id: string;
  name: string;
  icon_name: string;
  icon_color: string | null;
  parent_id: string | null;
};

export function TransactionCategorySelect({ categories, defaultValue }: { categories: Option[]; defaultValue?: string | null }) {
  const [value, setValue] = useState(defaultValue && categories.some((category) => category.id === defaultValue) ? defaultValue : categories[0]?.id ?? "");
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const selected = categoryById.get(value) ?? categories[0];

  function label(category: Option) {
    const parent = category.parent_id ? categoryById.get(category.parent_id) : null;
    return parent ? `${parent.name} › ${category.name}` : category.name;
  }

  if (categories.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
        Chưa có danh mục hoạt động. Hãy tạo hoặc khôi phục danh mục trước.
      </div>
    );
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: iconColorValue(selected?.icon_color) }}><CategoryIcon name={selected?.icon_name} className="size-4" /></span>
      <select
        name="category_id"
        required
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]"
      >
        {categories.map((category) => <option key={category.id} value={category.id}>{label(category)}</option>)}
      </select>
    </div>
  );
}
