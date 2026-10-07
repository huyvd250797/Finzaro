# Changelog

## V0.1.0 — Net Worth & Financial Position

- Added `/net-worth` Financial Position dashboard.
- Added user-owned `net_worth_snapshots` with RLS and daily/currency uniqueness.
- Added Assets vs Liabilities, Net Worth, Liquid Assets, Debt-to-Asset and Liquidity Coverage.
- Added 12-snapshot Net Worth trend and manual server-recomputed snapshot action.
- Excluded Savings Goals from asset total to prevent double counting.
- Kept currencies independent; no implicit FX conversion.
- Restored center mobile `(+)` transaction action with `2 left + center + 2 right`, keeping `Thêm` at far right.
- Added quick transaction sheet for Expense / Income / Transfer.
- Added robust iOS/PWA document scroll lock for modal and bottom sheet overlays.
- Added confirmation before editing metadata of categories already used by transactions.
- Category name updates now synchronize transaction display snapshots after explicit confirmation.
- Replaced legacy category fixed icon constraint with expanded current icon allow-list so newer icons can be saved.
- Added pre-paint theme bootstrap so splash screen immediately matches saved Light/Dark preference.
- Adopted project versioning policy `X.Y.Z`; planned V0.0.13 becomes V0.1.0 because this is a feature/module release.

## Next

V0.2.0 — Financial Health Score & Intelligence.
