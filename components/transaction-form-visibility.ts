/** Scroll the owning container, never the document behind a locked dialog.
 * Keep the active field between the sticky header and footer above the iOS keyboard. */
export function revealTransactionFormTarget(target: HTMLElement) {
  if (!target.isConnected) return;
  const sheetRoot = target.closest<HTMLElement>("[data-fin-sheet-scroll]");
  const pageRoot = target.closest<HTMLElement>(".fin-main-region");
  const root = sheetRoot ?? pageRoot;
  const viewport = window.visualViewport;
  const keyboardOpen = Boolean(viewport && window.innerHeight - viewport.height > 100);
  const rootRect = root?.getBoundingClientRect();
  const visibleTop = (viewport?.offsetTop ?? 0) + 10;
  const visibleBottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight) - 12;
  // A full-screen form may have its own sticky action button inside its scroller.
  const hasStickyFooter = Boolean(sheetRoot?.querySelector('.sticky.bottom-0'));
  const reserveBottom = hasStickyFooter ? 104 : 24;
  const topLimit = Math.max(rootRect?.top ?? visibleTop, visibleTop) + (sheetRoot ? 20 : 12);
  const bottomLimit = Math.min(rootRect?.bottom ?? visibleBottom, keyboardOpen ? visibleBottom : window.innerHeight) - reserveBottom;
  const rect = target.getBoundingClientRect();
  if (root) {
    // A field taller than the available area is aligned by its top, not chased
    // in both directions by consecutive VisualViewport resize events.
    if (rect.top < topLimit || rect.height > bottomLimit - topLimit) {
      root.scrollBy({ top: rect.top - topLimit, behavior: "auto" });
    } else if (rect.bottom > bottomLimit) {
      root.scrollBy({ top: rect.bottom - bottomLimit, behavior: "auto" });
    }
  } else if (rect.top < visibleTop + 12 || rect.bottom > visibleBottom - 24) {
    target.scrollIntoView({ block: "center", behavior: "auto" });
  }
}
