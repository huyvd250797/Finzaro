import { ReportPrintButton } from "@/components/report-print-button";
import { loadFinancialReport } from "@/features/reports/server-report";
import { formatMinorMoney } from "@/lib/utils";
import { flowValue } from "@/features/reports/advanced";
import Link from "next/link";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "In báo cáo thu chi Finzaro" };
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
export default async function PrintReportPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const params = Object.fromEntries(Object.entries(raw).map(([k,v]) => [k,Array.isArray(v)?v[0]:v])) as Record<string,string|undefined>;
  const r = await loadFinancialReport(params);
  if (r.ledger.diagnostics.strategy === "empty") return <div className="fin-page-shell p-8 text-rose-500">Không đủ dữ liệu để in báo cáo chính xác.</div>;
  const money = (value: number) => formatMinorMoney(value,r.currency,r.digits);
  const allRows = r.current.filter(tx => flowValue(tx,r.currency,"income") > 0 || flowValue(tx,r.currency,"expense") > 0);
  const rows = allRows.slice(0, 500);
  return <div className="fin-print-document mx-auto max-w-[950px] bg-white p-5 text-slate-900 sm:p-8">
    <div className="mb-6 flex flex-wrap justify-between gap-3 print:hidden"><Link href={`/reports/statements?${r.query}`} className="fin-secondary-btn">← Quay lại</Link><ReportPrintButton/></div>
    <div className="flex items-start justify-between gap-3 border-b-2 border-emerald-700 pb-5"><div><p className="text-xs font-bold tracking-[.2em] text-emerald-800">FINZARO FINANCIAL REPORT</p><h1 className="mt-2 text-2xl font-black">BÁO CÁO THU CHI</h1><p className="mt-1 text-xs text-slate-600">{r.range.from} đến {r.range.to} · Đơn vị: {r.currency}</p></div><span className="text-xs text-slate-500">Báo cáo cá nhân</span></div>
    <div className="mt-5 grid grid-cols-3 gap-2">{[["Tổng thu",r.comparison.current.income],["Tổng chi",r.comparison.current.expense],["Dòng tiền ròng",r.comparison.current.net]].map(([label,value]) => <div key={String(label)} className="rounded border border-slate-200 p-3"><p className="text-xs text-slate-600">{label}</p><p className="mt-1 break-words text-sm font-black">{money(Number(value))}</p></div>)}</div>
    <h2 className="mt-7 text-base font-black">1. Tổng hợp theo tháng</h2><table className="fin-print-table mt-2 w-full"><thead><tr><th>Tháng</th><th>Thu</th><th>Chi</th><th>Ròng</th></tr></thead><tbody>{r.monthly.map(row => <tr key={row.key}><td>{row.key}</td><td>{money(row.income)}</td><td>{money(row.expense)}</td><td>{money(row.net)}</td></tr>)}</tbody></table>
    <h2 className="mt-7 text-base font-black">2. Phân bổ Thu / Chi</h2><div className="grid grid-cols-2 gap-5"><table className="fin-print-table mt-2 w-full"><thead><tr><th>Loại</th><th>Danh mục</th><th>Giá trị</th></tr></thead><tbody>{r.statementCategories.map(row => <tr key={`${row.flowType}-${row.id}`}><td>{row.flowType === "income" ? "Thu" : "Chi"}</td><td>{row.label}</td><td>{money(row.amount)}</td></tr>)}</tbody></table><table className="fin-print-table mt-2 w-full"><thead><tr><th>Loại</th><th>Tài khoản</th><th>Giá trị</th></tr></thead><tbody>{r.statementAccounts.map(row => <tr key={`${row.flowType}-${row.id}`}><td>{row.flowType === "income" ? "Thu" : "Chi"}</td><td>{row.label}</td><td>{money(row.amount)}</td></tr>)}</tbody></table></div>
    <h2 className="mt-7 text-base font-black">3. Chi tiết giao dịch ({rows.length}/{allRows.length})</h2><table className="fin-print-table mt-2 w-full"><thead><tr><th>Ngày</th><th>Giao dịch</th><th>Thu</th><th>Chi</th></tr></thead><tbody>{rows.map(tx => <tr key={tx.id}><td className="whitespace-nowrap">{tx.transaction_date}</td><td>{tx.title}</td><td>{flowValue(tx,r.currency,"income") ? money(flowValue(tx,r.currency,"income")) : ""}</td><td>{flowValue(tx,r.currency,"expense") ? money(flowValue(tx,r.currency,"expense")) : ""}</td></tr>)}</tbody></table>
    <p className="mt-6 border-t border-slate-200 pt-3 text-[10px] text-slate-500">Finzaro · Bản in giới hạn 500 giao dịch gần nhất để tránh treo trình duyệt; file Excel/CSV có toàn bộ giao dịch trong kỳ. Chỉ gồm giao dịch Thu/Chi thông thường và tiền tệ {r.currency}. Các khoản chuyển tiền và nghiệp vụ lịch sử không được tính vào tổng. Đây không phải báo cáo tài chính doanh nghiệp đã kiểm toán.</p>
  </div>;
}
