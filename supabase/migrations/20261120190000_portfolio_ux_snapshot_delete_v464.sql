-- Finzaro V4.6.4 — Portfolio UX, Snapshot Permission & Delete Asset Fix
-- RUN ONCE AFTER V4.6.0 + V4.6.1 + V4.6.2.
-- Additive only. Existing positions, snapshots and price sources are preserved.
BEGIN;

create or replace function public.portfolio_save_snapshot_v464(
  p_snapshot_date date,
  p_estimated_value_vnd numeric,
  p_missing_quotes integer default 0
) returns boolean
language plpgsql security definer set search_path='' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_snapshot_date is null then raise exception 'Ngày chụp thống kê không hợp lệ' using errcode='22023'; end if;
  if p_estimated_value_vnd is null or p_estimated_value_vnd < 0 then raise exception 'Giá trị danh mục không hợp lệ' using errcode='22023'; end if;
  if p_missing_quotes is null or p_missing_quotes < 0 then raise exception 'Số lượng giá thiếu không hợp lệ' using errcode='22023'; end if;

  insert into public.portfolio_snapshots_v460(user_id,snapshot_date,estimated_value_vnd,missing_quotes,created_at)
  values(v_uid,p_snapshot_date,round(p_estimated_value_vnd,2),p_missing_quotes,now())
  on conflict(user_id,snapshot_date) do update
    set estimated_value_vnd=excluded.estimated_value_vnd,
        missing_quotes=excluded.missing_quotes,
        created_at=now();
  return true;
end;
$$;
revoke all on function public.portfolio_save_snapshot_v464(date,numeric,integer) from public, anon;
grant execute on function public.portfolio_save_snapshot_v464(date,numeric,integer) to authenticated;
comment on function public.portfolio_save_snapshot_v464(date,numeric,integer) is
  'Finzaro V4.6.4: owner-scoped snapshot writer used to avoid direct table permission failures from client upsert.';

create or replace function public.portfolio_delete_v464(p_position_id uuid)
returns boolean
language plpgsql security definer set search_path='' as $$
declare
  v_uid uuid := auth.uid();
  v_exists boolean := false;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_position_id is null then raise exception 'Mã tài sản không hợp lệ' using errcode='22023'; end if;

  select true into v_exists from public.portfolio_positions_v460 where id=p_position_id and user_id=v_uid for update;
  if not found then raise exception 'Tài sản không tồn tại hoặc không có quyền xóa' using errcode='42501'; end if;

  delete from public.portfolio_trades_v460 where position_id=p_position_id and user_id=v_uid;
  delete from public.portfolio_positions_v460 where id=p_position_id and user_id=v_uid;
  return true;
end;
$$;
revoke all on function public.portfolio_delete_v464(uuid) from public, anon;
grant execute on function public.portfolio_delete_v464(uuid) to authenticated;
comment on function public.portfolio_delete_v464(uuid) is
  'Finzaro V4.6.4: permanently delete an owned portfolio asset and its trade history.';

COMMIT;
