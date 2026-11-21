# Finzaro V4.6.12 — Keyboard-Safe Forms & Family Fund Deletion

1. Backup Supabase.
2. Execute `supabase/migrations/20261121220000_family_fund_delete_v4612.sql` (same content as the separately supplied Migration TXT), **after** V4.6.11.
3. Push the full source ZIP using Zipverra and deploy to Vercel. No extra-file deletion needed for a clean V4.6.11 repository.
4. On iPhone, open Quỹ gia đình → Tạo quỹ → type into name, bank, interest rate, then select date and amount (calculator); verify focused field is visible above the keyboard and the button stays accessible. Repeat on Công nợ and ordinary transaction inputs.
5. Test Xóa quỹ: (a) new unused fund → delete; (b) fund with transactions + positive balance → blocked; (c) after withdrawal down to zero → archived with history; (d) other user's fund ID → blocked.

This release does not change previous transaction data. The new database function has not been executed against the production database in this workspace; verify after migration.
