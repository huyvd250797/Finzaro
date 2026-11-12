/** Finzaro V4: keep an invalid field or server error visible inside the iOS
 * sheet instead of scrolling the locked document behind the overlay. */
export function revealTransactionFormTarget(target: HTMLElement) {
  const scrollRoot = target.closest<HTMLElement>("[data-fin-sheet-scroll]");
  if (!scrollRoot) {
    target.scrollIntoView({ block: "center", behavior: "auto" });
    return;
  }
  const rootRect = scrollRoot.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  // Actions are now outside the scrollport; reserve only the normal focus margin.
  const topLimit = rootRect.top + 24;
  const bottomLimit = rootRect.bottom - 28;
  if (targetRect.top < topLimit) {
    scrollRoot.scrollBy({ top: targetRect.top - topLimit, behavior: "auto" });
  } else if (targetRect.bottom > bottomLimit) {
    scrollRoot.scrollBy({ top: targetRect.bottom - bottomLimit, behavior: "auto" });
  }
}
