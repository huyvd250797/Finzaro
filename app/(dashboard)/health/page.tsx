import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgePercent,
  Banknote,
  BarChart3,
  CircleDollarSign,
  CreditCard,
  Gauge,
  HeartPulse,
  PiggyBank,
  RefreshCw,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  WalletCards
} from "lucide-react";
import { AuthMessage } from "@/components/auth-message";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { saveFinancialHealthSnapshotAction } from "@/features/financial-health/actions";
import { loadFinancialHealthData, type HealthInsight, type HealthSubscoreKey } from "@/features/financial-health/data";
import { requireUser } from "@/lib/auth";
import { formatMinorMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Financial Health" };

type SearchParams = Promise<{ error?: string; message?: string }>;

const subscoreIcons: Record<HealthSubscoreKey, typeof Activity> = {
  cashflow: Activity,
  savings: PiggyBank,
  budget: Target,
  liquidity: WalletCards,
  debt: Scale,
  credit: CreditCard,
  net_worth: TrendingUp
};

function scoreTone(score: number) {
  if (score >= 85) return "text-emerald-600";
  if (score >= 70) return "text-sky-600";
  if (score >= 55) return "text-amber-600";
  return "text-rose-500";
}

function barTone(score: number) {
  if (score >= 85) return "bg-emerald-500";
  if (score >= 70) return "bg-sky-500";
  if (score >= 55) return "bg-amber-500";
  return "bg-rose-500";
}

function insightMeta(tone: HealthInsight["tone"]) {
  if (tone === "positive") return { icon: ShieldCheck, box: "border-emerald-500/20 bg-emerald-500/[.055]", iconClass: "text-emerald-600 bg-emerald-500/10" };
  if (tone === "negative") return { icon: AlertTriangle, box: "border-rose-500/20 bg-rose-500/[.055]", iconClass: "text-rose-500 bg-rose-500/10" };
  if (tone === "warning") return { icon: AlertTriangle, box: "border-amber-500/20 bg-amber-500/[.055]", iconClass: "text-amber-600 bg-amber-500/10" };
  return { icon: Sparkles, box: "border-[var(--border)] bg-[var(--muted)]/45", iconClass: "text-sky-600 bg-sky-500/10" };
}

function metricText(value: number | null, suffix = "%") {
  return value === null ? "—" : `${value}${suffix}`;
}

export default async function FinancialHealthPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { supabase, userId } = await requireUser();
  const health = await loadFinancialHealthData(supabase, userId);
  const digits = health.currency_decimal_digits;
  const latestSnapshots = health.snapshots.slice(-12);

  const metricRows = [
    { label: "Thu nhập tháng", value: formatMinorMoney(health.metrics.current_income_minor, health.currency_code, digits), icon: Banknote },
    { label: "Chi tiêu tháng", value: formatMinorMoney(health.metrics.current_expense_minor, health.currency_code, digits), icon: BadgePercent },
    { label: "Dòng tiền ròng", value: formatMinorMoney(health.metrics.current_net_minor, health.currency_code, digits), icon: Activity },
    { label: "Recurring 30 ngày", value: formatMinorMoney(health.metrics.recurring_commitments_minor, health.currency_code, digits), icon: RefreshCw },
    { label: "Loan burden", value: metricText(health.metrics.loan_payment_burden_percent), icon: Scale },
    { label: "Net Worth", value: formatMinorMoney(health.metrics.net_worth_minor, health.currency_code, digits), icon: TrendingUp }
  ];

  return (
    <div className="mx-auto max-w-[1500px] min-w-0 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--primary)]">Intelligence · Financial Health</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Financial Health Score</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
            Tổng hợp dòng tiền, savings rate, ngân sách, thanh khoản, dư nợ, tín dụng và Net Worth thành một chỉ số có giải thích. Đây là công cụ quản lý cá nhân, không phải điểm tín dụng hay tư vấn đầu tư.
          </p>
        </div>
        <form action={saveFinancialHealthSnapshotAction}>
          <PendingSubmitButton idleLabel="Lưu Health snapshot" pendingLabel="Đang lưu..." className="fin-primary-btn" />
        </form>
      </div>

      <AuthMessage error={params.error} message={params.message} />

      <div className="mt-6 grid gap-4 xl:grid-cols-[.72fr_1.28fr]">
        <Card className="fin-card overflow-hidden border-emerald-500/20">
          <CardContent className="relative p-6 sm:p-7">
            <div className="absolute -right-16 -top-20 size-52 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <HeartPulse className="size-5 text-[var(--primary)]" />
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Finzaro Health</span>
                </div>
                <span className="fin-badge">Confidence {health.data_confidence}%</span>
              </div>
              <div className="mt-6 flex items-end gap-3">
                <p className={`text-6xl font-black tracking-tight ${scoreTone(health.overall_score)}`}>{health.overall_score}</p>
                <div className="pb-2">
                  <p className="text-sm font-black">/ 100</p>
                  <p className="mt-1 text-xs font-bold text-[var(--muted-foreground)]">{health.grade}</p>
                </div>
              </div>
              <div className="mt-5 h-3 overflow-hidden rounded-full bg-[var(--muted)]">
                <div className={`h-full rounded-full ${barTone(health.overall_score)}`} style={{ width: `${health.overall_score}%` }} />
              </div>
              <p className="mt-4 text-xs leading-5 text-[var(--muted-foreground)]">Điểm được tính bằng rule-based engine có trọng số. Confidence phản ánh độ đầy đủ của dữ liệu Finzaro hiện có.</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="fin-card"><CardContent className="p-4"><CircleDollarSign className="size-5 text-emerald-600" /><p className="fin-stat-label">Savings rate</p><p className="fin-stat-value">{metricText(health.metrics.savings_rate_percent)}</p><p className="fin-stat-help">Net / Income tháng này</p></CardContent></Card>
          <Card className="fin-card"><CardContent className="p-4"><WalletCards className="size-5 text-sky-600" /><p className="fin-stat-label">Liquidity</p><p className="fin-stat-value">{health.metrics.liquidity_months === null ? "—" : `${health.metrics.liquidity_months} tháng`}</p><p className="fin-stat-help">So với chi tiêu bình quân</p></CardContent></Card>
          <Card className="fin-card"><CardContent className="p-4"><Scale className="size-5 text-rose-500" /><p className="fin-stat-label">Debt / Assets</p><p className="fin-stat-value">{health.metrics.debt_to_asset_percent}%</p><p className="fin-stat-help">Nghĩa vụ nợ / tài sản</p></CardContent></Card>
          <Card className="fin-card"><CardContent className="p-4"><CreditCard className="size-5 text-violet-600" /><p className="fin-stat-label">Credit utilization</p><p className="fin-stat-value">{health.metrics.credit_utilization_percent}%</p><p className="fin-stat-help">Tổng dư nợ / hạn mức</p></CardContent></Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {health.subscores.map((item) => {
          const Icon = subscoreIcons[item.key];
          return (
            <Card key={item.key} className="fin-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-[var(--muted)] text-[var(--primary)]"><Icon className="size-4" /></span>
                  <span className={`text-lg font-black ${scoreTone(item.score)}`}>{item.score}</span>
                </div>
                <p className="mt-3 text-sm font-black">{item.label}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--muted)]">
                  <div className={`h-full rounded-full ${barTone(item.score)}`} style={{ width: `${Math.max(0, Math.min(100, item.score))}%` }} />
                </div>
                <p className="mt-2 text-[11px] leading-5 text-[var(--muted-foreground)]">Trọng số {item.weight}% · {item.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <Card className="fin-card">
          <CardHeader>
            <div>
              <div className="flex items-center gap-2"><Sparkles className="size-4.5 text-[var(--primary)]" /><h2 className="font-black">Financial Intelligence</h2></div>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">Insight ưu tiên được sinh từ dữ liệu thực tế, không dùng AI đoán số liệu.</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {health.insights.map((insight, index) => {
              const meta = insightMeta(insight.tone);
              const Icon = meta.icon;
              return (
                <div key={`${insight.title}-${index}`} className={`rounded-2xl border p-4 ${meta.box}`}>
                  <div className="flex items-start gap-3">
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${meta.iconClass}`}><Icon className="size-4.5" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black">{insight.title}</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{insight.description}</p>
                      {insight.href && insight.action_label && <Link href={insight.href} className="mt-3 inline-flex items-center gap-1 text-xs font-black text-[var(--primary)]">{insight.action_label} <ArrowRight className="size-3.5" /></Link>}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="fin-card">
          <CardHeader><div><h2 className="font-black">Metrics nền</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Các biến chính dùng trong score · {health.currency_code}</p></div></CardHeader>
          <CardContent className="space-y-2">
            {metricRows.map((row) => {
              const MetricIcon = row.icon;
              return (
                <div key={row.label} className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--muted)] text-[var(--primary)]"><MetricIcon className="size-4" /></span>
                  <span className="min-w-0 flex-1 text-xs font-bold text-[var(--muted-foreground)]">{row.label}</span>
                  <span className="text-right text-xs font-black">{row.value}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 fin-card">
        <CardHeader>
          <div><h2 className="font-black">Health Score history</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Snapshot theo ngày · tối đa 12 điểm gần nhất hiển thị</p></div>
          <Link href="/net-worth" className="text-xs font-black text-[var(--primary)]">Net Worth <ArrowRight className="inline size-3.5" /></Link>
        </CardHeader>
        <CardContent>
          {latestSnapshots.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center">
              <Gauge className="mx-auto size-6 text-[var(--muted-foreground)]" />
              <p className="mt-3 text-sm font-black">Chưa có Health snapshot</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">Bấm “Lưu Health snapshot” để bắt đầu theo dõi xu hướng điểm theo thời gian.</p>
            </div>
          ) : (
            <div className="flex min-h-52 items-end gap-2 overflow-x-auto pb-1">
              {latestSnapshots.map((row) => (
                <div key={row.id} className="flex min-w-12 flex-1 flex-col items-center justify-end gap-2">
                  <span className={`text-[10px] font-black ${scoreTone(row.overall_score)}`}>{row.overall_score}</span>
                  <div className={`w-full max-w-12 rounded-t-lg ${barTone(row.overall_score)}`} style={{ height: `${Math.max(12, row.overall_score * 1.45)}px` }} />
                  <span className="text-[9px] text-[var(--muted-foreground)]">{row.snapshot_date.slice(5).split("-").reverse().join("/")}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Link href="/reports" className="fin-card block rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 transition hover:bg-[var(--muted)]"><BarChart3 className="size-5 text-sky-600" /><p className="mt-3 text-sm font-black">Báo cáo chi tiết</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">Khoan sâu vào cash flow, category và budget.</p></Link>
        <Link href="/goals" className="fin-card block rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 transition hover:bg-[var(--muted)]"><PiggyBank className="size-5 text-emerald-600" /><p className="mt-3 text-sm font-black">Cải thiện tiết kiệm</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">Đặt mục tiêu và tăng vùng đệm thanh khoản.</p></Link>
        <Link href="/net-worth" className="fin-card block rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 transition hover:bg-[var(--muted)]"><Scale className="size-5 text-violet-600" /><p className="mt-3 text-sm font-black">Financial Position</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">Theo dõi Assets, Liabilities và Net Worth.</p></Link>
      </div>
    </div>
  );
}
