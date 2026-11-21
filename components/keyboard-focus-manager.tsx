"use client";

import { useEffect } from "react";
import { revealTransactionFormTarget } from "@/components/transaction-form-visibility";

/** Single delegated focus observer for non-modal inputs and native comboboxes.
 * Sheets handle their own visual viewport, so never scroll the page behind them. */
export function KeyboardFocusManager() {
  useEffect(() => {
    let pending: number | undefined;
    let settle: number | undefined;
    const editable = (node: Element | null): node is HTMLElement => Boolean(node && node.matches(
      'input:not([type="hidden"]):not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled]), select:not([disabled]), [role="combobox"], [contenteditable="true"]'
    ));
    function reveal() {
      const target = document.activeElement;
      if (!editable(target) || target.closest(".fin-sheet-backdrop")) return;
      revealTransactionFormTarget(target);
    }
    function schedule() {
      window.clearTimeout(pending);
      pending = window.setTimeout(reveal, 35);
    }
    function onFocus(event: FocusEvent) {
      if (!editable(event.target instanceof Element ? event.target : null)) return;
      schedule();
      window.clearTimeout(settle);
      settle = window.setTimeout(reveal, 340);
    }
    document.addEventListener("focusin", onFocus);
    window.visualViewport?.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("scroll", schedule);
    return () => {
      document.removeEventListener("focusin", onFocus);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
      window.clearTimeout(pending);
      window.clearTimeout(settle);
    };
  }, []);
  return null;
}
