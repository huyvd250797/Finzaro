import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type InvestmentAssetType = "gold" | "stock" | "fund" | "real_estate" | "vehicle" | "business" | "collectible" | "other";

export const ASSET_TYPE_LABELS: Record<InvestmentAssetType, string> = {
  gold: "Vàng / Kim loại quý",
  stock: "Cổ phiếu",
  fund: "ETF / Quỹ",
  real_estate: "Bất động sản",
  vehicle: "Xe / Phương tiện",
  business: "Doanh nghiệp / Góp vốn",
  collectible: "Tài sản sưu tầm",
  other: "Tài sản khác"
};

export type InvestmentAsset = {
  id: string;
  user_id: string;
  name: string;
  asset_type: InvestmentAssetType;
  currency_code: string;
  quantity: number | null;
  cost_basis_minor: number;
  current_value_minor: number;
  ticker_symbol: string | null;
  exchange: "HOSE" | "HNX" | "UPCOM" | "OTHER" | null;
  average_buy_price_minor: number | null;
  market_price_minor: number | null;
  market_price_updated_at: string | null;
  market_data_provider: "manual" | "ssi";
  auto_price_enabled: boolean;
  institution_name: string | null;
  purchase_date: string | null;
  valuation_date: string;
  linked_account_id: string | null;
  icon_name: string;
  icon_color: string;
  notes: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type AssetValuation = {
  id: string;
  user_id: string;
  asset_id: string;
  valuation_date: string;
  value_minor: number;
  cost_basis_minor: number;
  notes: string | null;
  created_at: string;
};

export type AssetAccount = { id: string; name: string; currency_code: string; account_type: string; institution_name: string | null; is_archived: boolean };
export type AssetCurrency = { code: string; name: string; symbol: string; decimal_digits: number };

export type InvestmentAssetView = InvestmentAsset & {
  gain_loss_minor: number;
  return_percent: number | null;
  linked_account: AssetAccount | null;
  valuations: AssetValuation[];
};

export async function loadInvestmentAssets(supabase: SupabaseClient<Database>, userId: string, includeArchived = false) {
  let assetQuery = (supabase as any).from("investment_assets").select("*").eq("user_id", userId).order("is_archived").order("current_value_minor", { ascending: false }).order("created_at", { ascending: false });
  if (!includeArchived) assetQuery = assetQuery.eq("is_archived", false);
  const [{ data: assets, error: assetError }, { data: valuations, error: valuationError }, { data: accounts, error: accountError }, { data: currencies, error: currencyError }] = await Promise.all([
    assetQuery,
    (supabase as any).from("asset_valuations").select("*").eq("user_id", userId).order("valuation_date", { ascending: false }).order("created_at", { ascending: false }).limit(5000),
    supabase.from("accounts").select("id,name,currency_code,account_type,institution_name,is_archived").eq("user_id", userId),
    supabase.from("supported_currencies").select("code,name,symbol,decimal_digits").eq("is_active", true).order("code")
  ]);
  if (assetError) throw assetError;
  if (valuationError) throw valuationError;
  if (accountError) throw accountError;
  if (currencyError) throw currencyError;
  return {
    assets: (assets ?? []) as InvestmentAsset[],
    valuations: (valuations ?? []) as AssetValuation[],
    accounts: (accounts ?? []) as AssetAccount[],
    currencies: (currencies ?? []) as AssetCurrency[]
  };
}

export function investmentAssetViews(assets: InvestmentAsset[], valuations: AssetValuation[], accounts: AssetAccount[]): InvestmentAssetView[] {
  const valuationMap = new Map<string, AssetValuation[]>();
  for (const valuation of valuations) {
    const list = valuationMap.get(valuation.asset_id) ?? [];
    list.push(valuation);
    valuationMap.set(valuation.asset_id, list);
  }
  return assets.map((asset) => {
    const gain = asset.current_value_minor - asset.cost_basis_minor;
    return {
      ...asset,
      gain_loss_minor: gain,
      return_percent: asset.cost_basis_minor > 0 ? Math.round((gain / asset.cost_basis_minor) * 1000) / 10 : null,
      linked_account: asset.linked_account_id ? accounts.find((account) => account.id === asset.linked_account_id) ?? null : null,
      valuations: valuationMap.get(asset.id) ?? []
    };
  });
}

export function investmentAssetSummary(rows: InvestmentAssetView[], currencyCode: string) {
  const active = rows.filter((row) => !row.is_archived && row.currency_code === currencyCode);
  const currentValue = active.reduce((sum, row) => sum + row.current_value_minor, 0);
  const costBasis = active.reduce((sum, row) => sum + row.cost_basis_minor, 0);
  return {
    count: active.length,
    currentValue,
    costBasis,
    gainLoss: currentValue - costBasis,
    returnPercent: costBasis > 0 ? Math.round(((currentValue - costBasis) / costBasis) * 1000) / 10 : null,
    byType: Object.entries(ASSET_TYPE_LABELS).map(([type, label]) => ({ type: type as InvestmentAssetType, label, value: active.filter((row) => row.asset_type === type).reduce((sum, row) => sum + row.current_value_minor, 0) })).filter((row) => row.value > 0).sort((a, b) => b.value - a.value)
  };
}
