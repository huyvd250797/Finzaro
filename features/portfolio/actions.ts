"use server";

/* eslint-disable @typescript-eslint/no-explicit-any -- V4.6.0 schema migration is new; generated Supabase types update after migration. */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { parseDecimal, parseVndAmount, summarizePortfolio, valuePosition, type Position } from "@/features/portfolio/core";
import { portfolioMarketQuote, marketUsdtVnd } from "@/features/portfolio/market";

function input(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }
function number(form: FormData, key: string, decimals = 8, allowZero = false, isVnd = false) {
  const n = isVnd ? parseVndAmount(input(form,key),decimals) : parseDecimal(input(form,key), decimals);
  if (n === null || (allowZero ? n < 0 : n <= 0)) throw new Error(`Giá trị ${key} không hợp lệ.`);
  return n;
}
function go(kind: "error" | "message", message: string) {
  redirect(`/portfolio?${new URLSearchParams({ [kind]: message }).toString()}`);
}
async function withResult(operation: () => Promise<string>) {
  try {
    const message = await operation();
    revalidatePath("/portfolio");
    revalidatePath("/overview");
    go("message", message);
  } catch (error) {
    // Do not hide a redirect; handle only business exceptions before redirect.
    if (error && typeof error === "object" && "digest" in error) throw error;
    go("error", error instanceof Error ? error.message : "Có lỗi khi cập nhật tài sản.");
  }
}
function checkId(id: string) {
  if (!/^[a-f0-9-]{36}$/i.test(id)) throw new Error("Mã tài sản không hợp lệ.");
  return id;
}
function validateSymbol(kind: string, symbol: string) {
  const value = symbol.toUpperCase();
  if (kind !== "gold" && !/^[A-Z0-9]{2,15}$/.test(value)) throw new Error("Mã chứng khoán/crypto không hợp lệ.");
  return kind === "gold" ? "GOLD9999" : value;
}
export async function createPortfolioPosition(form: FormData) {
  await withResult(async () => {
    const { supabase } = await requireUser();
    const kind = input(form,"kind");
    if (!(["gold","stock","crypto"] as string[]).includes(kind)) throw new Error("Loại tài sản không hợp lệ.");
    const variant = kind === "gold" ? input(form,"variant") : "";
    const exchange = kind === "stock" ? input(form,"exchange") : "";
    if (kind === "gold" && !["pnj_ring","sjc_bar","other_ring"].includes(variant)) throw new Error("Chọn loại vàng hợp lệ.");
    if (kind === "stock" && !["HOSE","HNX","UPCOM"].includes(exchange)) throw new Error("Chọn sàn chứng khoán hợp lệ.");
    const symbol = validateSymbol(kind, input(form,"symbol"));
    const quantity = number(form,"quantity",kind === "crypto" ? 12 : kind === "gold" ? 1 : 0);
    if (kind === "stock" && !Number.isInteger(quantity)) throw new Error("Cổ phiếu phải nhập số nguyên.");
    const buyPrice = number(form,"buy_price",8,false,kind!=="crypto");
    const fee = number(form,"fee",8,true,kind!=="crypto");
    const manual = input(form,"manual_price");
    const manualPrice = manual ? number(form,"manual_price",8,false,kind!=="crypto") : null;
    const provider = kind === "stock" ? "vci" : kind === "crypto" ? "binance" : variant === "other_ring" ? "manual" : "pnj";
    const defaultName = kind === "gold" ? variant === "sjc_bar" ? "Vàng miếng SJC 9999" : variant === "pnj_ring" ? "Nhẫn trơn PNJ 9999" : "Vàng nhẫn 9999" : symbol;
    const { error } = await (supabase as any).rpc("portfolio_create_v460", {
      p_kind:kind,p_symbol:symbol,p_name:defaultName,p_variant:variant,p_exchange:exchange,p_provider:provider,
      p_quantity:quantity,p_buy_price:buyPrice,p_fee:fee,p_manual_price:manualPrice
    });
    if (error) throw new Error(error.message);
    return `Đã thêm ${defaultName} vào danh mục.`;
  });
}
/** Edit an existing holding, including its opening purchase, via an atomic historical replay. */
export async function editPortfolioAsset(form: FormData) {
  await withResult(async () => {
    const { supabase, userId } = await requireUser();
    const positionId = checkId(input(form,"position_id"));
    const { data: owner, error: ownerError } = await (supabase as any).from("portfolio_positions_v460")
      .select("kind,quote_currency").eq("id",positionId).eq("user_id",userId).maybeSingle();
    if (ownerError || !owner) throw new Error("Không tìm thấy tài sản cần sửa.");
    const kind = String(owner.kind);
    if (!["gold","stock","crypto"].includes(kind)) throw new Error("Loại tài sản không hợp lệ.");
    const name = input(form,"name");
    if (!name || name.length > 120) throw new Error("Tên tài sản phải có 1–120 ký tự.");
    const symbol = validateSymbol(kind,input(form,"symbol"));
    const variant = kind === "gold" ? input(form,"variant") : "";
    const exchange = kind === "stock" ? input(form,"exchange") : "";
    const provider = input(form,"provider");
    if (kind === "gold" && !["pnj_ring","sjc_bar","other_ring"].includes(variant)) throw new Error("Loại vàng không hợp lệ.");
    if (kind === "stock" && !["HOSE","HNX","UPCOM"].includes(exchange)) throw new Error("Sàn chứng khoán không hợp lệ.");
    if (!(kind === "gold" ? ["pnj","manual"].includes(provider) : kind === "stock" ? ["vci","ssi","manual"].includes(provider) : ["binance","manual"].includes(provider))) {
      throw new Error("Nguồn giá không phù hợp với tài sản.");
    }
    const initialQuantity = number(form,"initial_quantity",kind === "crypto" ? 12 : kind === "gold" ? 1 : 0);
    const isVnd = owner.quote_currency === "VND";
    const initialBuyPrice = number(form,"initial_buy_price",8,false,isVnd);
    const initialFee = number(form,"initial_fee",8,true,isVnd);
    const manual = input(form,"manual_price");
    const manualPrice = manual ? number(form,"manual_price",8,false,isVnd) : null;
    const { error } = await (supabase as any).rpc("portfolio_edit_v461", {
      p_position_id:positionId,p_name:name,p_symbol:symbol,p_variant:variant,p_exchange:exchange,
      p_provider:provider,p_manual_price:manualPrice,
      p_initial_quantity:initialQuantity,p_initial_buy_price:initialBuyPrice,p_initial_fee:initialFee
    });
    if (error) throw new Error(error.message);
    return `Đã lưu thay đổi cho ${name}. Số lượng, giá vốn và lãi/lỗ được đối soát lại.`;
  });
}

export async function portfolioTrade(form: FormData) {
  await withResult(async () => {
    const {supabase,userId} = await requireUser();
    const positionId=checkId(input(form,"position_id"));
    const {data:owner,error:ownerError}=await (supabase as any).from("portfolio_positions_v460")
      .select("kind,quote_currency").eq("id",positionId).eq("user_id",userId).maybeSingle();
    if(ownerError || !owner) throw new Error("Không tìm thấy tài sản để ghi nhận giao dịch.");
    const isVnd=owner.quote_currency==="VND";
    const {error} = await (supabase as any).rpc("portfolio_trade_v460",{
      p_position_id:positionId,p_side:input(form,"side"),
      p_quantity:number(form,"quantity",owner.kind==="gold"?1:owner.kind==="stock"?0:12),
      p_unit_price:number(form,"unit_price",8,false,isVnd),p_fee:number(form,"fee",8,true,isVnd)
    });
    if (error) throw new Error(error.message);
    return "Đã ghi nhận giao dịch đầu tư và tính lại giá vốn.";
  });
}
export async function updatePortfolioPosition(form: FormData) {
  await withResult(async () => {
    const {supabase,userId} = await requireUser();
    const manual = input(form,"manual_price");
    const positionId=checkId(input(form,"position_id"));
    const {data:owner,error:ownerError}=await (supabase as any).from("portfolio_positions_v460")
      .select("quote_currency").eq("id",positionId).eq("user_id",userId).maybeSingle();
    if(ownerError || !owner) throw new Error("Không tìm thấy tài sản.");
    const {error} = await (supabase as any).rpc("portfolio_update_v460",{
      p_position_id:positionId,p_provider:input(form,"provider"),
      p_manual_price:manual ? number(form,"manual_price",8,false,owner.quote_currency==="VND"):null,p_archived:input(form,"archived")==="1"
    });
    if (error) throw new Error(error.message);
    return "Đã cập nhật nguồn định giá tài sản.";
  });
}
export async function savePortfolioFx(form: FormData) {
  await withResult(async () => {
    const {supabase,userId}=await requireUser();
    const rate = number(form,"usdt_vnd",4,false,true);
    if (rate < 1000 || rate > 1_000_000) throw new Error("Tỷ giá USDT/VND không hợp lệ.");
    const {error}=await (supabase as any).from("portfolio_fx_v460").upsert({user_id:userId,usdt_vnd:rate,source:"manual",updated_at:new Date().toISOString()},{onConflict:"user_id"});
    if (error) throw new Error(error.message);
    return "Đã lưu tỷ giá USDT/VND thủ công.";
  });
}
export async function savePortfolioSnapshot() {
  await withResult(async () => {
    const {supabase,userId}=await requireUser();
    const { data:positions,error }=await (supabase as any).from("portfolio_positions_v460")
      .select("id,kind,symbol,name,variant,exchange,quote_currency,provider,quantity,cost_total,manual_price,archived")
      .eq("user_id",userId).eq("archived",false);
    if (error) throw new Error(error.message);
    const {data:fx,error:fxError}=await (supabase as any).from("portfolio_fx_v460").select("usdt_vnd").eq("user_id",userId).maybeSingle();
    if (fxError) throw new Error(fxError.message);
    const autoFx=(positions??[]).some((p:Position)=>p.kind==="crypto") ? await marketUsdtVnd() : null;
    if((positions??[]).length>150) throw new Error("Danh mục vượt 150 tài sản, chưa thể lưu thống kê đầy đủ.");
    const rate=autoFx?.rate??(fx?.usdt_vnd ? Number(fx.usdt_vnd) : null);
    const rows=await Promise.all(((positions ?? []) as Position[]).map(async position=>valuePosition(position,await portfolioMarketQuote(position),rate)));
    const summary=summarizePortfolio(rows);
    // A partial snapshot is never recorded as a complete financial history row.
    if (summary.missing > 0) throw new Error(`Còn ${summary.missing} tài sản chưa có giá/tỷ giá, không thể lưu thống kê đầy đủ.`);
    const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Ho_Chi_Minh",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
    const get=(type:string)=>parts.find(part=>part.type===type)?.value??"";
    const date=`${get("year")}-${get("month")}-${get("day")}`;
    const {error:saveError}=await (supabase as any).from("portfolio_snapshots_v460").upsert({
      user_id:userId,snapshot_date:date,estimated_value_vnd:summary.value,missing_quotes:0,created_at:new Date().toISOString()
    },{onConflict:"user_id,snapshot_date"});
    if(saveError) throw new Error(saveError.message);
    return "Đã lưu ảnh chụp giá trị danh mục hôm nay.";
  });
}
