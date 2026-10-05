# Database package

- `migrations/0001_foundation.sql`: V0.1.0 schema + bootstrap + RLS.
- `tests/rls_smoke.sql`: owner/non-owner test template.

Source of truth is confirmed transaction/ledger data. `accounts` intentionally has no mutable `balance` column.
