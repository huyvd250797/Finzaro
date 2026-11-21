-- Finzaro V4.6.11 — Family Fund Opening Balance
-- APPLY AFTER V4.6.7. Creates opening balance directly, never a fake transaction.
-- For existing empty funds: one-time declaration with no prior ledger entries.
BEGIN;

CREATE TABLE IF NOT EXISTS public.family_fund_openings_v4611 (
  account_id uuid PRIMARY KEY REFERENCES public.family_savings_funds_v466(account_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opening_amount_minor bigint NOT NULL CHECK(opening_amount_minor > 0 AND opening_amount_minor <= 9007199254740991),
  declared_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS family_fund_openings_owner_v4611 ON public.family_fund_openings_v4611(user_id);
ALTER TABLE public.family_fund_openings_v4611 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.family_fund_openings_v4611 FROM public,anon,authenticated;
GRANT SELECT ON public.family_fund_openings_v4611 TO authenticated;
DROP POLICY IF EXISTS "family fund opening own read v4611" ON public.family_fund_openings_v4611;
CREATE POLICY "family fund opening own read v4611" ON public.family_fund_openings_v4611
  FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.family_fund_create_v4611(
  p_name text, p_institution_name text, p_target_amount_minor bigint,
  p_monthly_contribution_minor bigint, p_maturity_date date,
  p_annual_interest_rate numeric, p_opening_balance_minor bigint
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_uid uuid:=auth.uid();v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Bạn cần đăng nhập.' USING errcode='42501'; END IF;
  IF length(btrim(coalesce(p_name,''))) NOT BETWEEN 1 AND 100
    OR length(btrim(coalesce(p_institution_name,'')))>100
    OR p_target_amount_minor IS NULL OR p_target_amount_minor NOT BETWEEN 0 AND 9007199254740991
    OR p_monthly_contribution_minor IS NULL OR p_monthly_contribution_minor NOT BETWEEN 0 AND 9007199254740991
    OR p_opening_balance_minor IS NULL OR p_opening_balance_minor NOT BETWEEN 0 AND 9007199254740991
    OR (p_annual_interest_rate IS NOT NULL AND p_annual_interest_rate NOT BETWEEN 0 AND 100)
  THEN RAISE EXCEPTION 'Thông tin quỹ hoặc số dư đầu kỳ không hợp lệ.' USING errcode='22023'; END IF;
  INSERT INTO public.accounts(user_id,name,account_type,currency_code,institution_name,opening_balance_minor,current_balance_minor)
    VALUES(v_uid,btrim(p_name),'family_savings','VND',nullif(btrim(coalesce(p_institution_name,'')),''),p_opening_balance_minor,p_opening_balance_minor)
    RETURNING id INTO v_id;
  INSERT INTO public.family_savings_funds_v466(account_id,user_id,target_amount_minor,monthly_contribution_minor,maturity_date,annual_interest_rate)
    VALUES(v_id,v_uid,p_target_amount_minor,p_monthly_contribution_minor,p_maturity_date,p_annual_interest_rate);
  IF p_opening_balance_minor>0 THEN
    INSERT INTO public.family_fund_openings_v4611(account_id,user_id,opening_amount_minor)
      VALUES(v_id,v_uid,p_opening_balance_minor);
  END IF;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.family_fund_declare_opening_v4611(
  p_account_id uuid,p_opening_balance_minor bigint
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_uid uuid:=auth.uid();v_account public.accounts%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Bạn cần đăng nhập.' USING errcode='42501'; END IF;
  IF p_account_id IS NULL OR p_opening_balance_minor IS NULL
    OR p_opening_balance_minor NOT BETWEEN 1 AND 9007199254740991
  THEN RAISE EXCEPTION 'Số dư đầu kỳ không hợp lệ.' USING errcode='22023'; END IF;
  SELECT * INTO v_account FROM public.accounts
    WHERE id=p_account_id AND user_id=v_uid AND account_type='family_savings' AND is_archived=false FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quỹ không tồn tại.' USING errcode='42501'; END IF;
  IF v_account.opening_balance_minor<>0 OR v_account.current_balance_minor<>0
    OR EXISTS(SELECT 1 FROM public.family_fund_openings_v4611 WHERE account_id=p_account_id AND user_id=v_uid)
    OR EXISTS(SELECT 1 FROM public.transaction_entries WHERE account_id=p_account_id AND user_id=v_uid)
  THEN RAISE EXCEPTION 'Chỉ khai báo một lần trước khi quỹ phát sinh giao dịch. Không được ghi lại số dư đang có.' USING errcode='22023'; END IF;
  UPDATE public.accounts SET opening_balance_minor=p_opening_balance_minor,
    current_balance_minor=p_opening_balance_minor,updated_at=now()
    WHERE id=p_account_id AND user_id=v_uid;
  INSERT INTO public.family_fund_openings_v4611(account_id,user_id,opening_amount_minor)
    VALUES(p_account_id,v_uid,p_opening_balance_minor);
  RETURN true;
END; $$;

REVOKE ALL ON FUNCTION public.family_fund_create_v4611(text,text,bigint,bigint,date,numeric,bigint),
  public.family_fund_declare_opening_v4611(uuid,bigint) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.family_fund_create_v4611(text,text,bigint,bigint,date,numeric,bigint),
  public.family_fund_declare_opening_v4611(uuid,bigint) TO authenticated;
COMMIT;
