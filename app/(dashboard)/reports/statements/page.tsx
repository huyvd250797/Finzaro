import Link from "next/link";
import { Download, FileSpreadsheet, Printer, ArrowLeft, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ReportNavigation } from "@/components/report-navigation";
import { ReportDataStatus } from "@/components/report-data-status";
import { loadFinancialReport } from "@/features/reports/server-report";
import { flowValue } from "@/features/reports/advanced";
import { formatMinorMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Sổ báo cáo tài chính" };
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function FinancialStatementsPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const params = Object.fromEntries(Object.entries(raw).map(([k,v]) => [k, Array.isArray(v) ? v[0] : v])) as Record<string,string|undefined>;
  const r = await loadFinancialReport(params);
  const money = (value: number) => formatMinorMoney(value,r.currency,r.digits);
  const invalid = r.ledger.diagnostics.strategy === "empty";
  const expenseRows = r.current.filter(tx => flowValue(tx,r.currency,"expense") > 0 || flowValue(tx,r.currency,"income") > 0);
  const detail = expenseRows.slice(0, 100);
  return <main className="fin-page-shell mx-auto max-w-[1200px] space-y-4 px-3 py-4 sm:px-4 md:px-6 lg:px-8 lg:py-7">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-[var(--primary)]">FINZARO · V3.0.0</p><h1 className="mt-1 text-2xl font-black">Báo cáo thu chi chuyên nghiệp</h1><p className="mt-1 text-xs text-[var(--muted-foreground)]">{r.range.from} → {r.range.to} · {r.currency} · Theo bộ lọc đã chọn</p></div><div className="flex flex-wrap gap-2"><Link href={`/reports/analysis?${r.query}`} className="fin-secondary-btn !text-xs"><ArrowLeft className="size-4"/> Phân tích</Link><Link href={`/api/reports/export?${r.query}&format=xlsx`} className="fin-primary-btn !text-xs"><FileSpreadsheet className="size-4"/> Excel</Link><Link href={`/api/reports/export?${r.query}&format=csv`} className="fin-secondary-btn !text-xs"><Download className="size-4"/> CSV</Link><Link href={`/reports/print?${r.query}`} target="_blank" rel="noopener" className="fin-secondary-btn !text-xs"><Printer className="size-4"/> PDF / In</Link></div></div>
    <ReportNavigation active="statements"/>
    <ReportDataStatus diagnostics={r.ledger.diagnostics}/>
    {invalid ? <Card><CardContent className="p-6 text-sm text-rose-500">Dữ liệu đang lỗi, không thể lập báo cáo chính xác. Không hiển thị các giá trị bằng 0 thay cho dữ liệu thiếu.</CardContent></Card> : <>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">{[
        ["Tổng thu",r.comparison.current.income,"text-emerald-500"],
        ["Tổng chi",r.comparison.current.expense,"text-rose-500"],
        ["Dòng tiền ròng",r.comparison.current.net,"text-sky-500"],
        ["Trung bình khoản chi",r.comparison.current.averageExpense,"text-[var(--primary)]"]
      ].map(([label,amount,color]) => <Card key={String(label)}><CardContent className="p-3 sm:p-4"><p className="text-xs text-[var(--muted-foreground)]">{label}</p><p className={`mt-2 break-words text-base font-black sm:text-lg ${color}`}>{money(Number(amount))}</p></CardContent></Card>)}</div>
      <Card><CardContent className="p-0"><div className="border-b border-[var(--border)] p-4"><h2 className="font-black">Bảng dòng tiền theo tháng</h2><p className="text-xs text-[var(--muted-foreground)]">Giá trị theo {r.currency}; chỉ gồm Thu/Chi thông thường</p></div><div className="overflow-x-auto"><table className="fin-report-table"><thead><tr><th>Tháng</th><th>Thu</th><th>Chi</th><th>Ròng</th><th>Thao tác</th></tr></thead><tbody>{r.monthly.map((item) => <tr key={item.key}><td className="font-bold">{item.key}</td><td className="text-right text-emerald-500">{money(item.income)}</td><td className="text-right text-rose-500">{money(item.expense)}</td><td className="text-right font-bold">{money(item.net)}</td><td className="text-right"><Link href={`/transactions?from=${item.key}-01&to=${item.key}-${String(new Date(Date.UTC(Number(item.key.slice(0,4)),Number(item.key.slice(5,7)),0)).getUTCDate()).padStart(2,"0")}`} className="text-xs font-bold text-[var(--primary)]">Xem giao dịch</Link></td></tr>)}{!r.monthly.length && <tr><td colSpan={5}>Chưa có dữ liệu.</td></tr>}</tbody></table></div></CardContent></Card>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card><CardContent className="p-0"><h2 className="border-b border-[var(--border)] p-4 font-black">Thu/Chi theo danh mục</h2><div className="max-h-[460px] overflow-auto"><table className="fin-report-table"><thead><tr><th>Loại</th><th>Danh mục</th><th>Giá trị</th><th>%</th></tr></thead><tbody>{r.statementCategories.map(row => <tr key={`${row.flowType}-${row.id}`}><td>{row.flowType === "income" ? "Thu" : "Chi"}</td><td>{row.label}</td><td className="text-right">{money(row.amount)}</td><td className="text-right">{row.percent}%</td></tr>)}{!r.statementCategories.length && <tr><td colSpan={4}>Chưa có dữ liệu.</td></tr>}</tbody></table></div></CardContent></Card>
        <Card><CardContent className="p-0"><h2 className="border-b border-[var(--border)] p-4 font-black">Thu/Chi theo tài khoản</h2><div className="max-h-[460px] overflow-auto"><table className="fin-report-table"><thead><tr><th>Loại</th><th>Tài khoản</th><th>Giá trị</th><th>%</th></tr></thead><tbody>{r.statementAccounts.map(row => <tr key={`${row.flowType}-${row.id}`}><td>{row.flowType === "income" ? "Thu" : "Chi"}</td><td>{row.label}</td><td className="text-right">{money(row.amount)}</td><td className="text-right">{row.percent}%</td></tr>)}{!r.statementAccounts.length && <tr><td colSpan={4}>Chưa có dữ liệu.</td></tr>}</tbody></table></div></CardContent></Card>
      </div>
      <Card><CardContent className="p-0"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] p-4"><div><h2 className="flex items-center gap-2 font-black"><FileText className="size-4"/> Chi tiết giao dịch</h2><p className="text-[11px] text-[var(--muted-foreground)]">Hiển thị tối đa 100 giao dịch gần nhất; xuất Excel/CSV để lấy đầy đủ giao dịch trong kỳ.</p></div><span className="text-xs text-[var(--muted-foreground)]">{expenseRows.length} giao dịch phù hợp</span></div><div className="overflow-x-auto"><table className="fin-report-table"><thead><tr><th>Ngày</th><th>Nội dung</th><th>Danh mục</th><th>Thu</th><th>Chi</th></tr></thead><tbody>{detail.map((tx) => <tr key={tx.id}><td className="whitespace-nowrap">{tx.transaction_date}</td><td className="min-w-36"><Link href={`/transactions?q=${encodeURIComponent(tx.title)}`} className="font-semibold hover:text-[var(--primary)]">{tx.title}</Link></td><td>{tx.category?.name ?? tx.category_label ?? "Chưa phân loại"}</td><td className="text-right text-emerald-500">{flowValue(tx,r.currency,"income") ? money(flowValue(tx,r.currency,"income")) : "—"}</td><td className="text-right text-rose-500">{flowValue(tx,r.currency,"expense") ? money(flowValue(tx,r.currency,"expense")) : "—"}</td></tr>)}{detail.length === 0 && <tr><td colSpan={5}>Chưa có giao dịch trong kỳ.</td></tr>}</tbody></table></div></CardContent></Card>
      <p className="text-[11px] text-[var(--muted-foreground)]">Bảng này là báo cáo thu chi theo giao dịch, không phải bảng cân đối kế toán hoặc báo cáo tài chính theo chuẩn doanh nghiệp. Khoản chuyển tiền không phát sinh thu nhập/chi tiêu và các ngoại tệ không được quy đổi tự động.</p>
    </>}
  </main>;
}
