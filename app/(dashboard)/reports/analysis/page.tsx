import Link from "next/link";
import { Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CashflowChart } from "@/components/cashflow-chart";
import { ReportDataStatus } from "@/components/report-data-status";
import { ReportNavigation } from "@/components/report-navigation";
import { CategoryIcon, iconColorValue } from "@/features/categories/icons";
import { accountSpending, categorySpending, filterReportTransactions, loadReportLedger, monthlyCashflow, normalizeReportFilters, previousComparableRange, reportTotals, resolveReportRange } from "@/features/reports/data";
import { currencyDigits } from "@/features/transactions/data";
import { requireUser } from "@/lib/auth";
import { formatMinorMoney } from "@/lib/utils";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Phân tích Thu Chi" };
type SearchParams = Promise<Record<string,string|string[]|undefined>>;
export default async function ReportAnalysisPage({ searchParams }: { searchParams: SearchParams }) {
 const raw = await searchParams;
 const params = Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,Array.isArray(v)?v[0]:v])) as Record<string,string|undefined>;
 const {supabase,userId} = await requireUser();
 const {data: pref} = await supabase.from("user_preferences").select("currency_code,timezone").eq("id",userId).maybeSingle();
 const timeZone = pref?.timezone ?? "Asia/Ho_Chi_Minh";
 const fallbackCurrency = pref?.currency_code ?? "VND";
 const range = resolveReportRange(params.range,params.from,params.to,timeZone);
 const previousRange = previousComparableRange(range);
 const ledger = await loadReportLedger(supabase,userId,{fromDate:previousRange.from,toDate:range.to,includeAccounts:true,includeCategories:true});
 const currency = ledger.currencies.some(c=>c.code===params.currency)?params.currency!:fallbackCurrency;
 const digits = currencyDigits(ledger.currencies,currency);
 const filters = normalizeReportFilters({...params,currency},range,fallbackCurrency);
 const normalized = {...filters,
   account: filters.account==="all"||ledger.accounts.some(a=>a.id===filters.account)?filters.account:"all",
   category: filters.category==="all"||ledger.categories.some(c=>c.id===filters.category)?filters.category:"all",
   type: ["all","income","expense","transfer"].includes(filters.type)?filters.type:"all"};
 const transactions=filterReportTransactions(ledger.transactions,normalized,ledger.categories);
 const totals=reportTotals(transactions,currency);
 const monthly=monthlyCashflow(transactions,currency,range.from,range.to);
 const categories=categorySpending(transactions,currency);
 const accounts=accountSpending(transactions,currency,ledger.accounts);
 const query = new URLSearchParams(); for(const [key,value] of Object.entries(params)) if(value) query.set(key,value);
 query.set("range",range.key);query.set("currency",currency);if(range.key==="custom"){query.set("from",range.from);query.set("to",range.to);}
 return <div className="mx-auto max-w-[1100px] px-3 py-5 sm:px-4 md:px-6 lg:px-8 lg:py-7">
  <div className="flex items-center justify-between gap-3"><div><h1 className="text-2xl font-black">Phân tích thu chi</h1><p className="mt-1 text-xs text-[var(--muted-foreground)]">Thống kê từ các khoản Thu/Chi thông thường. Chuyển tiền và giao dịch nợ cũ không tính vào tổng.</p></div><Link href={`/api/reports/export?${query.toString()}`} className="fin-secondary-btn text-xs"><Download className="size-4"/> CSV</Link></div>
  <div className="mt-4"><ReportNavigation active="analysis"/></div>
  <ReportDataStatus diagnostics={ledger.diagnostics}/>
  <Card className="mt-3"><CardContent className="p-3 sm:p-4"><form method="get" className="grid grid-cols-2 gap-2 md:grid-cols-4">
   <label className="text-xs">Khoảng thời gian<select name="range" defaultValue={range.key} className="fin-input mt-1"><option value="this_month">Tháng này</option><option value="last_month">Tháng trước</option><option value="3m">3 tháng</option><option value="6m">6 tháng</option><option value="12m">12 tháng</option><option value="ytd">Năm nay</option><option value="custom">Tùy chọn</option></select></label>
   <label className="text-xs">Tài khoản<select name="account" defaultValue={normalized.account} className="fin-input mt-1"><option value="all">Tất cả</option>{ledger.accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
   <label className="text-xs">Loại<select name="type" defaultValue={normalized.type} className="fin-input mt-1"><option value="all">Thu + Chi</option><option value="income">Thu</option><option value="expense">Chi</option></select></label>
   <label className="text-xs">Danh mục<select name="category" defaultValue={normalized.category} className="fin-input mt-1"><option value="all">Tất cả</option>{ledger.categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
   <label className="text-xs">Từ ngày<input name="from" type="date" defaultValue={range.from} className="fin-input mt-1"/></label>
   <label className="text-xs">Đến ngày<input name="to" type="date" defaultValue={range.to} className="fin-input mt-1"/></label>
   <label className="text-xs">Tiền tệ<select name="currency" defaultValue={currency} className="fin-input mt-1">{ledger.currencies.map(c=><option key={c.code} value={c.code}>{c.code}</option>)}</select></label>
   <button className="fin-primary-btn self-end" type="submit">Áp dụng</button>
  </form></CardContent></Card>
  <div className="mt-3 grid grid-cols-3 gap-2">{[{label:"Thu",value:totals.income,cls:"text-emerald-500"},{label:"Chi",value:totals.expense,cls:"text-rose-500"},{label:"Ròng",value:totals.net,cls:"text-sky-500"}].map(k=><Card key={k.label}><CardContent className="p-2.5 sm:p-4"><p className="text-[10px] text-[var(--muted-foreground)]">{k.label}</p><p className={`mt-1 break-words text-xs font-black sm:text-lg ${k.cls}`}>{formatMinorMoney(k.value,currency,digits)}</p></CardContent></Card>)}</div>
  <Card className="mt-4"><CardContent className="p-4"><h2 className="mb-4 font-black">Dòng tiền theo tháng</h2><CashflowChart data={monthly} decimalDigits={digits}/></CardContent></Card>
  <div className="mt-4 grid gap-3 lg:grid-cols-2">
   <Card><CardContent className="p-4"><h2 className="mb-3 font-black">Danh mục chi tiêu</h2><div className="space-y-3">{categories.map(c=><div key={c.id} className="flex items-center gap-2 text-sm"><span style={{color:iconColorValue(c.icon_color)}}><CategoryIcon name={c.icon_name} className="size-4"/></span><span className="min-w-0 flex-1 truncate">{c.label}</span><span className="text-xs font-bold">{formatMinorMoney(c.amount,currency,digits)} · {c.percent}%</span></div>)}{categories.length===0&&<p className="text-sm text-[var(--muted-foreground)]">Chưa có khoản chi.</p>}</div></CardContent></Card>
   <Card><CardContent className="p-4"><h2 className="mb-3 font-black">Chi theo tài khoản</h2><div className="space-y-3">{accounts.map(a=><div key={a.id} className="flex items-center justify-between gap-2 text-sm"><span className="truncate">{a.label}</span><span className="text-xs font-bold">{formatMinorMoney(a.amount,currency,digits)} · {a.percent}%</span></div>)}{accounts.length===0&&<p className="text-sm text-[var(--muted-foreground)]">Chưa có khoản chi.</p>}</div></CardContent></Card>
  </div>
 </div>;
}
