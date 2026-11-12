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
  // The sticky savebar can cover the last field, so reserve some bottom space.
  const topLimit = rootRect.top + 18;
  const bottomLimit = rootRect.bottom - 92;
  if (targetRect.top < topLimit) {
    scrollRoot.scrollBy({ top: targetRect.top - topLimit, behavior: "auto" });
  } else if (targetRect.bottom > bottomLimit) {
    scrollRoot.scrollBy({ top: targetRect.bottom - bottomLimit, behavior: "auto" });
  }
}
