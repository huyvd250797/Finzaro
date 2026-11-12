"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTransactionInlineAction } from "@/features/transactions/actions";

function notify(message: string, kind: "pending" | "success" | "error") {
  window.dispatchEvent(new CustomEvent("finzaro:transaction-feedback", { detail: { message, kind } }));
}

/** Optimistically collapse only the visible row. Financial totals are updated by the server RPC. */
export function TransactionDeleteControl({ transactionId }: { transactionId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  const remove = () => {
    if (pending) return;
    setError("");
    const row = buttonRef.current?.closest<HTMLElement>("[data-fin-transaction-row]");
    // No fake success: optimistic disappearance is reversible until RPC confirmation.
    row?.setAttribute("data-fin-deleting", "true");
    notify("Đang xóa giao dịch và cập nhật số dư…", "pending");
    startTransition(async () => {
      try {
        const result = await deleteTransactionInlineAction(transactionId);
        if (!result.ok) throw new Error(result.error);
        notify("Đã xóa giao dịch. Số dư đang được đồng bộ.", "success");
        router.refresh();
      } catch (cause) {
        row?.removeAttribute("data-fin-deleting");
        const message = cause instanceof Error ? cause.message : "Không thể xóa giao dịch.";
        setError(message);
        notify(`Xóa không thành công: ${message}`, "error");
      }
    });
  };

  return <div>
    <button ref={buttonRef} type="button" onClick={remove} disabled={pending} aria-busy={pending} className="inline-flex min-h-9 w-full items-center justify-center rounded-lg bg-rose-600 px-3 text-xs font-bold text-white disabled:opacity-60">
      {pending ? "Đang xóa…" : "Xác nhận xóa"}
    </button>
    {error && <p role="alert" className="mt-2 text-[11px] text-rose-500">{error}</p>}
  </div>;
}
