"use client";

import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { TransactionCopyPanel } from "@/components/transaction-copy-panel";
import { measureClientPaint } from "@/lib/client-performance";

type CopySource = { id: string; title: string; date: string; type: string };

/** Copy opens from already-rendered transaction cards, without a Next.js navigation or ledger reload.
 * The batch server action re-reads and validates the source in the DB; these data-attributes
 * are only display hints and are never trusted for money movement.
 */
export function InstantCopyOverlay() {
  const [source, setSource] = useState<CopySource | null>(null);
  useEffect(() => {
    const onCopyClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const element = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[data-fin-copy-id]") : null;
      if (!element || element.target === "_blank" || element.hasAttribute("download")) return;
      const id = element.dataset.finCopyId ?? "";
      const date = element.dataset.finCopyDate ?? "";
      const type = element.dataset.finCopyType ?? "";
      if (!/^[a-f\d-]{36}$/i.test(id) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !["income", "expense", "transfer"].includes(type)) return;
      event.preventDefault();
      const startedAt = performance.now();
      setSource({ id, date, type, title: element.dataset.finCopyTitle ?? "Giao dịch" });
      measureClientPaint("transactions.copy.open", startedAt);
    };
    // Capture before Link's bubble listener; preventDefault keeps Next from fetching the route.
    document.addEventListener("click", onCopyClick, true);
    return () => document.removeEventListener("click", onCopyClick, true);
  }, []);

  return <BottomSheet open={Boolean(source)} onClose={() => setSource(null)} label="Sao chép giao dịch" zIndex="z-[115]" panelClassName="max-w-2xl sm:mb-4 sm:rounded-3xl">
    {source && <TransactionCopyPanel key={source.id} sourceId={source.id} sourceTitle={source.title} sourceDate={source.date} type={source.type} embedded onClose={() => setSource(null)} />}
  </BottomSheet>;
}
