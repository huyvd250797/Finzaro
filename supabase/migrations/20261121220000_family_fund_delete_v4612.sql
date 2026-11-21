-- Finzaro V4.6.12 — Family Fund Safe Delete (run AFTER V4.6.11).
-- No existing data is modified by applying this migration.
-- A fund without ledger history is deleted; an empty fund with history is archived.
-- A fund with movements and a remaining balance must be withdrawn first.
BEGIN;

CREATE OR REPLACE FUNCTION public.family_fund_delete_v4612(
  p_account_id uuid
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_balance bigint;
  v_has_entries boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Bạn cần đăng nhập.' USING errcode = '42501';
  END IF;
  IF p_account_id IS NULL THEN
    RAISE EXCEPTION 'Mã quỹ không hợp lệ.' USING errcode = '22023';
  END IF;

  -- Lock the owned family account to serialize deletion with balance mutations.
  SELECT a.current_balance_minor INTO v_balance
  FROM public.accounts a
  WHERE a.id = p_account_id
    AND a.user_id = v_uid
    AND a.account_type = 'family_savings'
    AND a.is_archived = false
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy quỹ hoặc quỹ đã được lưu trữ.' USING errcode = '42501';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.transaction_entries e
    WHERE e.account_id = p_account_id AND e.user_id = v_uid
  ) INTO v_has_entries;

  IF v_has_entries THEN
    IF v_balance <> 0 THEN
      RAISE EXCEPTION 'Quỹ còn tiền hoặc có giao dịch. Hãy chuyển hết số dư về tài khoản cá nhân trước khi xóa.'
        USING errcode = '22023';
    END IF;
    -- Preserve transaction history and foreign key references for reconciliation.
    UPDATE public.accounts SET is_archived = true, updated_at = now()
    WHERE id = p_account_id AND user_id = v_uid;
    RETURN 'archived';
  END IF;

  -- A fund can also be referenced by a debt payment even without a standard
  -- transfer entry. Preserve the account rather than cascading external records.
  IF EXISTS (
    SELECT 1 FROM public.personal_debt_events_v467 e
    WHERE e.account_id = p_account_id AND e.user_id = v_uid
  ) THEN
    IF v_balance <> 0 THEN
      RAISE EXCEPTION 'Quỹ còn tiền và được liên kết với công nợ; cần đối soát trước khi xóa.'
        USING errcode = '22023';
    END IF;
    UPDATE public.accounts SET is_archived = true, updated_at = now()
    WHERE id = p_account_id AND user_id = v_uid;
    RETURN 'archived';
  END IF;

  -- No ledger/event references: removing an initial balance is NOT an expense.
  -- FK cascades delete only the fund metadata and opening balance declaration.
  DELETE FROM public.accounts
  WHERE id = p_account_id AND user_id = v_uid
    AND account_type = 'family_savings' AND is_archived = false;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không thể xóa quỹ.' USING errcode = '42501';
  END IF;
  RETURN 'deleted';
EXCEPTION WHEN foreign_key_violation THEN
  RAISE EXCEPTION 'Quỹ còn liên kết dữ liệu khác và không thể xóa vĩnh viễn. Hãy kiểm tra lịch sử liên quan.'
    USING errcode = '23503';
END;
$$;

REVOKE ALL ON FUNCTION public.family_fund_delete_v4612(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.family_fund_delete_v4612(uuid)
  TO authenticated;
COMMIT;
