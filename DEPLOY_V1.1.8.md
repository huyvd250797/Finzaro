# Deploy Finzaro V1.1.8

No database migration is required for V1.1.8.

Recommended deployment:

1. Replace the full source tree with V1.1.8.
2. Push to GitHub / redeploy Vercel with Clear build cache once.
3. Confirm the app badge shows V1.1.8.
4. Smoke-test Reports → Lịch:
   - tap several dates; day detail should switch immediately without a page reload,
   - double-tap a date and create Expense/Income/Transfer,
   - save and confirm the app returns to the same date detail,
   - swipe a standard Income/Expense row left, edit it, save and verify return,
   - swipe a row left and delete it; confirm balance rollback.

The existing V1.1.2 migration remains required for Account → Deposit → Goal integrity if it has not already been applied.
