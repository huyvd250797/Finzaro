import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarRange, CircleDollarSign, Landmark, Scale, ShieldCheck, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { AuthMessage } from "@/components/auth-message";
import { ScenarioPlanner } from "@/components/scenario-planner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { loadForecastData } from "@/features/forecasting/data";
import { requireUser } from "@/lib/auth";
import { formatMinorMoney } from "@/lib/utils";

export const metadata = { title: "Dự báo & Kịch bản" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ error?: string; message?: string }>;

export default async function ForecastPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { supabase, userId } = await requireUser();
  const forecast = await loadForecastData(supabase, userId);
  const money = (value: number) => formatMinorMoney(value, forecast.currency_code, forecast.decimal_digits);

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--primary)]">Planning · Forward View</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Forecasting & Scenario Planning</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">Dự báo Cash Position từ lịch định kỳ, lịch trả nợ, sao kê thẻ, đáo hạn tiền gửi và hành vi thu/chi lịch sử; sau đó stress-test các kịch bản trước khi ra quyết định.</p>
        </div>
        <div className="flex gap-2"><Link href="/health" className="fin-secondary-btn">Sức khỏe tài chính</Link><Link href="/net-worth" className="fin-primary-btn">Tài sản ròng <ArrowRight className="size-4" /></Link></div>
      </div>

      <AuthMessage error={params.error} message={params.message} />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="fin-card"><CardContent className="p-5"><WalletCards className="size-5 text-[var(--primary)]" /><p className="fin-stat-label">Cash hiện tại · {forecast.currency_code}</p><p className="fin-stat-value">{money(forecast.current_liquid_balance_minor)}</p><p className="fin-stat-help">Tài sản thanh khoản trong Account Core</p></CardContent></Card>
        <Card className="fin-card"><CardContent className="p-5"><CalendarRange className="size-5 text-sky-600" /><p className="fin-stat-label">Projected · 90 ngày</p><p className="fin-stat-value">{money(forecast.projected_balance_90_minor)}</p><p className="fin-stat-help">Baseline theo dữ liệu hiện có</p></CardContent></Card>
        <Card className="fin-card"><CardContent className="p-5"><TrendingUp className="size-5 text-emerald-600" /><p className="fin-stat-label">Known inflow · 30 ngày</p><p className="fin-stat-value">{money(forecast.next_30_known_income_minor)}</p><p className="fin-stat-help">Recurring income + deposit maturity</p></CardContent></Card>
        <Card className="fin-card"><CardContent className="p-5"><TrendingDown className="size-5 text-rose-500" /><p className="fin-stat-label">Known obligations · 30 ngày</p><p className="fin-stat-value">{money(forecast.next_30_known_expense_minor)}</p><p className="fin-stat-help">Recurring + loan + credit card</p></CardContent></Card>
      </div>

      {forecast.first_shortfall_month && <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/[.06] p-4"><AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-500" /><div><p className="text-sm font-black">Baseline phát hiện nguy cơ thiếu hụt dòng tiền</p><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Cash Position dự kiến có thể xuống dưới 0 vào {forecast.first_shortfall_month.split("-").reverse().join("/")}. Hãy thử Scenario Planner để kiểm tra phương án giảm chi hoặc tăng thu.</p></div></div>}

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <Card className="fin-card">
          <CardHeader><div><h2 className="font-black">Baseline 12 tháng</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Projected closing cash balance · {forecast.currency_code}</p></div><span className="fin-badge">12 tháng</span></CardHeader>
          <CardContent>
            <div className="flex min-h-64 items-end gap-2 overflow-x-auto pb-1">
              {forecast.points.map((point) => {
                const max = Math.max(1, ...forecast.points.map((item) => Math.abs(item.closing_balance_minor)), Math.abs(forecast.current_liquid_balance_minor));
                const height = Math.max(10, Math.round((Math.abs(point.closing_balance_minor) / max) * 180));
                return <div key={point.key} className="flex min-w-12 flex-1 flex-col items-center justify-end gap-2"><span className={`text-[9px] font-black ${point.closing_balance_minor >= 0 ? "text-emerald-600" : "text-rose-500"}`}>{Math.round(point.closing_balance_minor / 10 ** forecast.decimal_digits / 1_000_000 * 10) / 10}M</span><div className={`w-full max-w-12 rounded-t-xl ${point.closing_balance_minor >= 0 ? "bg-emerald-500" : "bg-rose-500"}`} style={{ height }} /><span className="text-[9px] text-[var(--muted-foreground)]">{point.label}</span></div>;
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="fin-card">
          <CardHeader><div><h2 className="font-black">Baseline assumptions</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Các dữ liệu nền engine đang sử dụng</p></div><ShieldCheck className="size-5 text-[var(--primary)]" /></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3"><CircleDollarSign className="size-4 text-emerald-600" /><span className="min-w-0 flex-1 text-xs font-bold text-[var(--muted-foreground)]">Thu nhập lịch sử / tháng</span><span className="text-xs font-black">{money(forecast.historical_average_income_minor)}</span></div>
            <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3"><TrendingDown className="size-4 text-rose-500" /><span className="min-w-0 flex-1 text-xs font-bold text-[var(--muted-foreground)]">Chi tiêu lịch sử / tháng</span><span className="text-xs font-black">{money(forecast.historical_average_expense_minor)}</span></div>
            <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3"><Landmark className="size-4 text-sky-600" /><span className="min-w-0 flex-1 text-xs font-bold text-[var(--muted-foreground)]">Projected 12 tháng</span><span className="text-xs font-black">{money(forecast.projected_balance_365_minor)}</span></div>
            <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3"><Scale className="size-4 text-violet-600" /><span className="min-w-0 flex-1 text-xs font-bold text-[var(--muted-foreground)]">Net Worth hiện tại</span><span className="text-xs font-black">{money(forecast.current_net_worth_minor)}</span></div>
            <div className="mt-3 space-y-2 rounded-2xl bg-[var(--muted)] p-4">{forecast.data_notes.map((note) => <p key={note} className="text-[11px] leading-5 text-[var(--muted-foreground)]">• {note}</p>)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4"><ScenarioPlanner points={forecast.points} currentBalanceMinor={forecast.current_liquid_balance_minor} currencyCode={forecast.currency_code} decimalDigits={forecast.decimal_digits} savedScenarios={forecast.saved_scenarios} /></div>
    </div>
  );
}
