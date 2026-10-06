"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { CATEGORY_ICON_NAMES, CategoryIcon, type CategoryIconName } from "@/features/categories/icons";
import { cn } from "@/lib/utils";

export function CategoryIconPicker({ name = "icon_name", defaultValue = "Shapes" }: { name?: string; defaultValue?: string }) {
  const initial = CATEGORY_ICON_NAMES.includes(defaultValue as CategoryIconName) ? (defaultValue as CategoryIconName) : "Shapes";
  const [selected, setSelected] = useState<CategoryIconName>(initial);

  return (
    <div>
      <input type="hidden" name={name} value={selected} />
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-10">
        {CATEGORY_ICON_NAMES.map((iconName) => {
          const active = iconName === selected;
          return (
            <button
              key={iconName}
              type="button"
              title={iconName}
              aria-label={`Chọn icon ${iconName}`}
              aria-pressed={active}
              onClick={() => setSelected(iconName)}
              className={cn(
                "relative grid aspect-square min-h-10 place-items-center rounded-xl border transition",
                active
                  ? "border-[var(--primary)] bg-[var(--sidebar-accent)] text-[var(--primary)] ring-2 ring-[var(--ring)]"
                  : "border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--foreground)]"
              )}
            >
              <CategoryIcon name={iconName} className="size-4.5" />
              {active && <Check className="absolute right-1 top-1 size-2.5" />}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">Icon đang chọn: <span className="font-semibold text-[var(--foreground)]">{selected}</span></p>
    </div>
  );
}
