# Finzaro UI/UX roadmap — approved

## Delivered together in V1.4.0

- V1.2.3 Stability & Performance Baseline: fix existing defects; measure/observe latency; preserve correctness and six-module scope.
- V1.3.0 Modern Design System: standardize layout, colors, spacing, controls, cards, modals, focus, dark/light and responsive behavior.
- V1.4.0 Transaction UX 2.0: simplify Thu/Chi/Chuyển forms, fast category/account selection, money-first form, quick recent suggestions, fewer taps and safe save handling.

These are implementation milestones, not three separate published ZIPs; the published source version is V1.4.0.

## Delivered together in V1.7.0 (based on V1.4.1)

- V1.5.0 — Smart Calendar Experience: clear two-line daily totals, fast date switch, double-tap create, swipe edit/delete and return to selected day.
- V1.6.0 — Reports & Charts Redesign: category-configured colors, interactive pie, compact legends, drill-down, month/year summaries and performance.
- V1.7.0 — Overview & Navigation Redesign: priority information above fold, fixed bottom nav and fewer screens/steps.

## Remaining roadmap (not yet delivered)

1. V1.8.0 — Accounts & Categories UX: wallet cards, quick category picker, accessible drag reorder and compact settings.
2. V1.9.0 — Speed, Motion & Accessibility: telemetry-informed performance, PWA/keyboard interactions, accessible targets and transitions.
3. V2.0.0 — Finzaro UX Release: end-to-end consistency, production smoke tests, regressions and UX acceptance.

**Scope guardrail:** keep only six modules (Overview, Transactions, Accounts, Categories, Reports & Calendar, Settings); never re-add removed loans, credit cards, deposits, goals, investments or budgets without a separate explicit user decision. Increment the version for every published source ZIP. Do not delete historical data implicitly.

## Shipped V2.2.0 — combined 2026 roadmap milestones

From V2.0.3, the following were delivered **in one source ZIP**:
- V2.0.4 Performance & Stability Foundation: startup/no-fixed-delay splash, opt-in local timing, single-pass 6-month cashflow aggregation, server-side type/category filtering, navigation progress fallback and synthetic benchmark.
- V2.1.0 Premium Fintech Design System: semantic light/dark surface/text/tone tokens, unified layout/card/form/button/filter/sheet/navigation styles across six modules.
- V2.2.0 Fluid Navigation & Transaction UX: prefetch main routes, preserve transaction form state between transaction types, accessible keyboard tabs/category selection, open search filter and natural touch scrolling.

Remaining roadmap begins with **V2.3.0 Financial Dashboard & Reports 2.0**. V2.4 Advanced Analytics, V2.5 Professional Statements/Export, V2.6 Scale/Motion/Accessibility, V3.0 Release remain proposals, not implemented in V2.2.0. See DEPLOY_V2.2.0.md for acceptance and limitations.
