"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useSheetFooterSlot } from "@/components/bottom-sheet";
import { cn } from "@/lib/utils";

/** A reusable anchored action row for account/category and future long forms.
 * Within a sheet it sits below the independent scrollport; inline pages keep
 * their original footer position. Submit controls must set form={formId}.
 */
export function SheetFormActions({ children, className }: { children: ReactNode; className?: string }) {
  const footer = useSheetFooterSlot();
  const actions = <div className={cn("fin-sheet-form-actions flex flex-wrap items-center gap-2", className)}>{children}</div>;
  return footer?.element ? createPortal(actions, footer.element) : actions;
}
