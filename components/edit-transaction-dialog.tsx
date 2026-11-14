"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { BottomSheet } from "@/components/bottom-sheet";

/** Fast edit preserves the existing atomic update RPC and accounting validation. */
export function EditTransactionDialog({ children, closeHref }: { children: ReactNode; closeHref: string }) {
  const router = useRouter();
  return <BottomSheet open label="Sửa giao dịch" zIndex="z-[110]" panelClassName="max-w-2xl sm:mb-4 sm:rounded-3xl" onClose={() => router.replace(closeHref)}>{children}</BottomSheet>;
}
