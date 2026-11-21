-- Finzaro V4.6.7 — Personal Lending & Borrowing Management
-- Apply AFTER V4.6.6. Personal debt is isolated from legacy loans and investment assets.
-- Principal cash legs are purpose=personal_debt (transfer, not Income/Expense).
-- Realized interest is standard Income/Expense through the canonical ledger engine.
BEGIN;

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_purpose_allowed_v112;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_purpose_allowed_v112 CHECK (
  transaction_purpose IN ('standard','credit_card_payment','loan_payment','credit_card_borrow',
    'loan_borrow','transfer','deposit_funding','personal_debt')
);

CREATE TABLE IF NOT EXISTS public.personal_debts_v467 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_key uuid NOT NULL,
  direction text NOT NULL CHECK (direction IN ('receivable','payable')),
  party_name text NOT NULL CHECK (char_length(btrim(party_name)) BETWEEN 1 AND 120),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 140),
  original_principal_minor bigint NOT NULL CHECK (original_principal_minor BETWEEN 1 AND 9007199254740991),
  outstanding_minor bigint NOT NULL CHECK (outstanding_minor >= 0 AND outstanding_minor <= original_principal_minor),
  started_on date NOT NULL,
  due_on date,
  annual_interest_rate numeric(7,4) CHECK (annual_interest_rate IS NULL OR annual_interest_rate BETWEEN 0 AND 100),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 500),
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT personal_debts_dates_v467 CHECK (due_on IS NULL OR due_on >= started_on),
  UNIQUE(user_id,request_key)
);
CREATE INDEX IF NOT EXISTS personal_debts_owner_v467 ON public.personal_debts_v467(user_id,archived,created_at DESC);
ALTER TABLE public.personal_debts_v467 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "personal debt own read v467" ON public.personal_debts_v467 FOR SELECT TO authenticated
  USING(user_id=(SELECT auth.uid()));
REVOKE ALL ON public.personal_debts_v467 FROM public,anon,authenticated;
GRANT SELECT ON public.personal_debts_v467 TO authenticated;

CREATE TABLE IF NOT EXISTS public.personal_debt_events_v467 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  debt_id uuid NOT NULL REFERENCES public.personal_debts_v467(id) ON DELETE CASCADE,
  request_key uuid NOT NULL,
  event_type text NOT NULL CHECK(event_type IN ('opening_existing','opening_cash','repayment')),
  principal_minor bigint NOT NULL DEFAULT 0 CHECK(principal_minor BETWEEN 0 AND 9007199254740991),
  interest_minor bigint NOT NULL DEFAULT 0 CHECK(interest_minor BETWEEN 0 AND 9007199254740991),
  account_id uuid REFERENCES public.accounts(id) ON DELETE RESTRICT,
  cash_transaction_id uuid UNIQUE REFERENCES public.transactions(id) ON DELETE RESTRICT,
  interest_transaction_id uuid UNIQUE REFERENCES public.transactions(id) ON DELETE RESTRICT,
  event_date date NOT NULL,
  notes text CHECK(notes IS NULL OR char_length(notes)<=500),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(principal_minor>0 OR interest_minor>0),
  UNIQUE(user_id,request_key)
);
CREATE INDEX IF NOT EXISTS personal_debt_events_owner_v467 ON public.personal_debt_events_v467(user_id,debt_id,event_date DESC,created_at DESC);
ALTER TABLE public.personal_debt_events_v467 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "personal debt event own read v467" ON public.personal_debt_events_v467 FOR SELECT TO authenticated
  USING(user_id=(SELECT auth.uid()));
REVOKE ALL ON public.personal_debt_events_v467 FROM public,anon,authenticated;
GRANT SELECT ON public.personal_debt_events_v467 TO authenticated;

-- One direction of an external loan cash movement is represented in the Finzaro cash ledger.
-- The corresponding receivable/payable is held in personal_debts_v467, not in Thu/Chi.
-- This private helper is not callable by authenticated users directly.
CREATE OR REPLACE FUNCTION public.personal_debt_cash_v467(
 p_user_id uuid,p_account_id uuid,p_delta_minor bigint,p_title text,p_date date,p_notes text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_tx uuid;
BEGIN
  IF p_delta_minor=0 OR p_delta_minor IS NULL THEN RETURN null; END IF;
  INSERT INTO public.transactions(user_id,transaction_type,transaction_purpose,title,category_label,notes,transaction_date)
  VALUES(p_user_id,'transfer','personal_debt',p_title,'Công nợ cá nhân',p_notes,p_date)
  RETURNING id INTO v_tx;
  INSERT INTO public.transaction_entries(transaction_id,user_id,account_id,currency_code,amount_minor,entry_role)
  VALUES(v_tx,p_user_id,p_account_id,'VND',p_delta_minor,
    CASE WHEN p_delta_minor>0 THEN 'transfer_in' ELSE 'transfer_out' END);
  UPDATE public.accounts SET current_balance_minor=current_balance_minor+p_delta_minor,updated_at=now()
    WHERE id=p_account_id AND user_id=p_user_id;
  RETURN v_tx;
END; $$;
REVOKE ALL ON FUNCTION public.personal_debt_cash_v467(uuid,uuid,bigint,text,date,text) FROM public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.personal_debt_create_v467(
 p_request_key uuid,p_direction text,p_party_name text,p_title text,
 p_principal_minor bigint,p_started_on date,p_due_on date,p_annual_interest_rate numeric,
 p_notes text,p_mode text,p_account_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_uid uuid:=auth.uid();v_id uuid;v_cash uuid;v_balance bigint;v_delta bigint;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Bạn cần đăng nhập.' USING errcode='42501'; END IF;
  IF p_request_key IS NULL THEN RAISE EXCEPTION 'Thiếu mã chống gửi trùng.' USING errcode='22023'; END IF;
  SELECT id INTO v_id FROM public.personal_debts_v467 WHERE user_id=v_uid AND request_key=p_request_key;
  IF FOUND THEN RETURN v_id; END IF;
  IF p_direction NOT IN ('receivable','payable') OR p_mode NOT IN ('cash','existing')
    OR char_length(btrim(coalesce(p_party_name,''))) NOT BETWEEN 1 AND 120
    OR char_length(btrim(coalesce(p_title,''))) NOT BETWEEN 1 AND 140
    OR p_principal_minor IS NULL OR p_principal_minor<=0 OR p_principal_minor>9007199254740991
    OR p_started_on IS NULL OR (p_due_on IS NOT NULL AND p_due_on<p_started_on)
    OR (p_annual_interest_rate IS NOT NULL AND (p_annual_interest_rate<0 OR p_annual_interest_rate>100))
    OR char_length(coalesce(p_notes,''))>500 THEN
    RAISE EXCEPTION 'Thông tin công nợ không hợp lệ.' USING errcode='22023';
  END IF;
  IF p_mode='cash' THEN
    IF p_account_id IS NULL THEN RAISE EXCEPTION 'Chọn tài khoản nhận hoặc giao tiền.' USING errcode='22023'; END IF;
    SELECT current_balance_minor INTO v_balance FROM public.accounts
      WHERE id=p_account_id AND user_id=v_uid AND not is_archived
        AND account_type IN ('cash','bank','ewallet') AND currency_code='VND' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Tài khoản VND không hợp lệ.' USING errcode='42501'; END IF;
    v_delta:=CASE WHEN p_direction='receivable' THEN -p_principal_minor ELSE p_principal_minor END;
    IF v_delta<0 AND v_balance<p_principal_minor THEN
      RAISE EXCEPTION 'Số dư khả dụng không đủ để cho vay.' USING errcode='22023';
    END IF;
    IF v_balance::numeric+v_delta::numeric NOT BETWEEN -9007199254740991 AND 9007199254740991 THEN
      RAISE EXCEPTION 'Số dư vượt giới hạn an toàn.' USING errcode='22003';
    END IF;
  ELSIF p_account_id IS NOT NULL THEN
    RAISE EXCEPTION 'Khoản nợ cũ không được chọn tài khoản để ghi tiền lần nữa.' USING errcode='22023';
  END IF;
  INSERT INTO public.personal_debts_v467(user_id,request_key,direction,party_name,title,
    original_principal_minor,outstanding_minor,started_on,due_on,annual_interest_rate,notes)
  VALUES(v_uid,p_request_key,p_direction,btrim(p_party_name),btrim(p_title),p_principal_minor,
    p_principal_minor,p_started_on,p_due_on,p_annual_interest_rate,nullif(btrim(coalesce(p_notes,'')),''))
  RETURNING id INTO v_id;
  IF p_mode='cash' THEN
    v_cash:=public.personal_debt_cash_v467(v_uid,p_account_id,v_delta,
      CASE WHEN p_direction='receivable' THEN 'Cho vay: ' ELSE 'Nhận tiền vay: ' END || btrim(p_party_name),
      p_started_on,p_notes);
  END IF;
  INSERT INTO public.personal_debt_events_v467(user_id,debt_id,request_key,event_type,principal_minor,
    interest_minor,account_id,cash_transaction_id,event_date,notes)
  VALUES(v_uid,v_id,p_request_key,CASE WHEN p_mode='cash' THEN 'opening_cash' ELSE 'opening_existing' END,
    p_principal_minor,0,CASE WHEN p_mode='cash' THEN p_account_id ELSE null END,
    v_cash,p_started_on,nullif(btrim(coalesce(p_notes,'')),''));
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.personal_debt_repay_v467(
 p_request_key uuid,p_debt_id uuid,p_account_id uuid,p_principal_minor bigint,
 p_interest_minor bigint,p_event_date date,p_notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_uid uuid:=auth.uid();v_loan public.personal_debts_v467%rowtype;
 v_event uuid;v_cash uuid;v_interest_tx uuid;v_balance bigint;v_delta bigint;
 v_interest_type text;v_interest_category uuid;v_interest_name text;v_interest_key text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Bạn cần đăng nhập.' USING errcode='42501'; END IF;
  IF p_request_key IS NULL THEN RAISE EXCEPTION 'Thiếu mã chống gửi trùng.' USING errcode='22023'; END IF;
  SELECT id INTO v_event FROM public.personal_debt_events_v467 WHERE user_id=v_uid AND request_key=p_request_key;
  IF FOUND THEN RETURN v_event; END IF;
  IF p_principal_minor IS NULL OR p_interest_minor IS NULL OR p_principal_minor<0 OR p_interest_minor<0
     OR (p_principal_minor=0 AND p_interest_minor=0)
     OR p_principal_minor::numeric+p_interest_minor::numeric>9007199254740991
     OR p_event_date IS NULL OR char_length(coalesce(p_notes,''))>500 THEN
    RAISE EXCEPTION 'Số tiền hoặc ngày thanh toán không hợp lệ.' USING errcode='22023';
  END IF;
  SELECT * INTO v_loan FROM public.personal_debts_v467 WHERE id=p_debt_id AND user_id=v_uid FOR UPDATE;
  IF NOT FOUND OR v_loan.archived THEN RAISE EXCEPTION 'Khoản nợ không tồn tại hoặc đã lưu trữ.' USING errcode='42501'; END IF;
  IF p_event_date<v_loan.started_on THEN RAISE EXCEPTION 'Ngày thanh toán trước ngày bắt đầu công nợ.' USING errcode='22023'; END IF;
  IF p_principal_minor>v_loan.outstanding_minor THEN RAISE EXCEPTION 'Số gốc thanh toán vượt dư nợ.' USING errcode='22023'; END IF;
  SELECT current_balance_minor INTO v_balance FROM public.accounts WHERE id=p_account_id AND user_id=v_uid
    AND not is_archived AND account_type IN ('cash','bank','ewallet') AND currency_code='VND' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tài khoản thanh toán VND không hợp lệ.' USING errcode='42501'; END IF;
  v_delta:=CASE WHEN v_loan.direction='receivable' THEN p_principal_minor ELSE -p_principal_minor END;
  IF v_loan.direction='payable' AND v_balance < p_principal_minor::numeric+p_interest_minor::numeric THEN
    RAISE EXCEPTION 'Số dư không đủ để trả gốc và lãi.' USING errcode='22023';
  END IF;
  IF v_balance::numeric+v_delta::numeric +
     (CASE WHEN v_loan.direction='receivable' THEN p_interest_minor ELSE -p_interest_minor END)::numeric
     NOT BETWEEN -9007199254740991 AND 9007199254740991 THEN
    RAISE EXCEPTION 'Số dư vượt giới hạn an toàn.' USING errcode='22003';
  END IF;
  IF p_principal_minor>0 THEN
    v_cash:=public.personal_debt_cash_v467(v_uid,p_account_id,v_delta,
      CASE WHEN v_loan.direction='receivable' THEN 'Thu hồi gốc: ' ELSE 'Trả gốc: ' END || v_loan.party_name,
      p_event_date,p_notes);
  END IF;
  IF p_interest_minor>0 THEN
    v_interest_type:=CASE WHEN v_loan.direction='receivable' THEN 'income' ELSE 'expense' END;
    v_interest_name:=CASE WHEN v_loan.direction='receivable' THEN 'Lãi cho vay cá nhân' ELSE 'Chi phí lãi vay cá nhân' END;
    v_interest_key:=CASE WHEN v_loan.direction='receivable' THEN 'personal_lending_interest_v467' ELSE 'personal_borrowing_interest_v467' END;
    SELECT id INTO v_interest_category FROM public.categories WHERE user_id=v_uid
      AND category_type=v_interest_type AND is_archived=false AND name=v_interest_name ORDER BY created_at LIMIT 1;
    IF v_interest_category IS NULL THEN
      SELECT id INTO v_interest_category FROM public.categories WHERE user_id=v_uid AND system_key=v_interest_key LIMIT 1;
      IF FOUND THEN
        UPDATE public.categories SET is_archived=false,updated_at=now() WHERE id=v_interest_category AND user_id=v_uid;
      ELSE
        INSERT INTO public.categories(user_id,name,category_type,icon_name,system_key,is_system)
          VALUES(v_uid,v_interest_name,v_interest_type,'CircleDollarSign',v_interest_key,true)
          RETURNING id INTO v_interest_category;
      END IF;
    END IF;
    v_interest_tx:=public.create_financial_transaction_v071(
      p_transaction_type=>v_interest_type,
      p_title=>CASE WHEN v_loan.direction='receivable' THEN 'Lãi cho vay: ' ELSE 'Lãi đã trả: ' END || v_loan.party_name,
      p_category_id=>v_interest_category,p_notes=>p_notes,p_transaction_date=>p_event_date,
      p_from_account_id=>CASE WHEN v_interest_type='expense' THEN p_account_id ELSE null END,
      p_to_account_id=>CASE WHEN v_interest_type='income' THEN p_account_id ELSE null END,
      p_from_amount_minor=>CASE WHEN v_interest_type='expense' THEN p_interest_minor ELSE null END,
      p_to_amount_minor=>CASE WHEN v_interest_type='income' THEN p_interest_minor ELSE null END,
      p_transaction_purpose=>'standard'
    );
  END IF;
  UPDATE public.personal_debts_v467 SET outstanding_minor=outstanding_minor-p_principal_minor,
    updated_at=now() WHERE id=p_debt_id AND user_id=v_uid;
  INSERT INTO public.personal_debt_events_v467(user_id,debt_id,request_key,event_type,principal_minor,
    interest_minor,account_id,cash_transaction_id,interest_transaction_id,event_date,notes)
  VALUES(v_uid,p_debt_id,p_request_key,'repayment',p_principal_minor,p_interest_minor,p_account_id,
    v_cash,v_interest_tx,p_event_date,nullif(btrim(coalesce(p_notes,'')),'')) RETURNING id INTO v_event;
  RETURN v_event;
END; $$;

CREATE OR REPLACE FUNCTION public.personal_debt_update_v467(
 p_debt_id uuid,p_party_name text,p_title text,p_due_on date,p_annual_interest_rate numeric,
 p_notes text,p_archived boolean
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_uid uuid:=auth.uid();v_start date;v_due bigint;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Bạn cần đăng nhập.' USING errcode='42501'; END IF;
  IF char_length(btrim(coalesce(p_party_name,''))) NOT BETWEEN 1 AND 120
    OR char_length(btrim(coalesce(p_title,''))) NOT BETWEEN 1 AND 140
    OR char_length(coalesce(p_notes,''))>500
    OR (p_annual_interest_rate IS NOT NULL AND (p_annual_interest_rate<0 OR p_annual_interest_rate>100)) THEN
    RAISE EXCEPTION 'Thông tin công nợ không hợp lệ.' USING errcode='22023';
  END IF;
  SELECT started_on,outstanding_minor INTO v_start,v_due FROM public.personal_debts_v467 WHERE id=p_debt_id AND user_id=v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy công nợ.' USING errcode='42501'; END IF;
  IF p_due_on IS NOT NULL AND p_due_on<v_start THEN RAISE EXCEPTION 'Ngày đến hạn không hợp lệ.' USING errcode='22023'; END IF;
  IF coalesce(p_archived,false) AND v_due<>0 THEN RAISE EXCEPTION 'Chỉ lưu trữ được công nợ đã tất toán.' USING errcode='22023'; END IF;
  UPDATE public.personal_debts_v467 SET party_name=btrim(p_party_name),title=btrim(p_title),due_on=p_due_on,
    annual_interest_rate=p_annual_interest_rate,notes=nullif(btrim(coalesce(p_notes,'')),''),
    archived=coalesce(p_archived,false),updated_at=now() WHERE id=p_debt_id AND user_id=v_uid;
  RETURN true;
END; $$;

-- Delete is allowed ONLY for a historical opening that never affected the cash ledger.
CREATE OR REPLACE FUNCTION public.personal_debt_delete_unposted_v467(p_debt_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_uid uuid:=auth.uid();v_count integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Bạn cần đăng nhập.' USING errcode='42501'; END IF;
  PERFORM 1 FROM public.personal_debts_v467 WHERE id=p_debt_id AND user_id=v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy công nợ.' USING errcode='42501'; END IF;
  SELECT count(*) INTO v_count FROM public.personal_debt_events_v467 WHERE debt_id=p_debt_id AND user_id=v_uid
    AND (event_type<>'opening_existing' OR cash_transaction_id IS NOT NULL OR interest_transaction_id IS NOT NULL);
  IF v_count>0 THEN RAISE EXCEPTION 'Công nợ có giao dịch tiền thực tế: không thể xóa, hãy tất toán rồi lưu trữ.' USING errcode='23503'; END IF;
  DELETE FROM public.personal_debts_v467 WHERE id=p_debt_id AND user_id=v_uid;
  RETURN true;
END; $$;

REVOKE ALL ON FUNCTION public.personal_debt_create_v467(uuid,text,text,text,bigint,date,date,numeric,text,text,uuid),
  public.personal_debt_repay_v467(uuid,uuid,uuid,bigint,bigint,date,text),
  public.personal_debt_update_v467(uuid,text,text,date,numeric,text,boolean),
  public.personal_debt_delete_unposted_v467(uuid) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.personal_debt_create_v467(uuid,text,text,text,bigint,date,date,numeric,text,text,uuid),
  public.personal_debt_repay_v467(uuid,uuid,uuid,bigint,bigint,date,text),
  public.personal_debt_update_v467(uuid,text,text,date,numeric,text,boolean),
  public.personal_debt_delete_unposted_v467(uuid) TO authenticated;
COMMIT;
