"use client";
import Link from "next/link";
import { useState } from "react";
import type { ReportFilters, ReportRange, ReportRangeKey } from "@/features/reports/data";

type Option = { id: string; name: string };
export function FinancialReportFilters({ range, filters, currency, currencies, accounts, categories }: {
  range: ReportRange;
  filters: ReportFilters;
  currency: string;
  currencies: string[];
  accounts: Option[];
  categories: Option[];
}) {
  const [rangeKey, setRangeKey] = useState<ReportRangeKey>(range.key);
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  return <form method="get" className="grid grid-cols-2 items-end gap-2 md:grid-cols-4 lg:grid-cols-7">
    <label className="text-xs font-semibold">Khoảng thời gian<select name="range" value={rangeKey} onChange={(e) => setRangeKey(e.target.value as ReportRangeKey)} className="fin-input mt-1"><option value="this_month">Tháng này</option><option value="last_month">Tháng trước</option><option value="3m">3 tháng</option><option value="6m">6 tháng</option><option value="12m">12 tháng</option><option value="ytd">Năm nay</option><option value="custom">Tùy chọn</option></select></label>
    <label className="text-xs font-semibold">Tài khoản<select name="account" defaultValue={filters.account} className="fin-input mt-1"><option value="all">Tất cả</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
    <label className="text-xs font-semibold">Loại<select name="type" defaultValue={filters.type} className="fin-input mt-1"><option value="all">Thu + Chi</option><option value="income">Thu</option><option value="expense">Chi</option></select></label>
    <label className="text-xs font-semibold">Danh mục<select name="category" defaultValue={filters.category} className="fin-input mt-1"><option value="all">Tất cả</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <label className="text-xs font-semibold">Từ ngày<input name="from" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setRangeKey("custom"); }} max={to} className="fin-input mt-1" /></label>
    <label className="text-xs font-semibold">Đến ngày<input name="to" type="date" value={to} onChange={(e) => { setTo(e.target.value); setRangeKey("custom"); }} min={from} className="fin-input mt-1" /></label>
    <label className="text-xs font-semibold">Tiền tệ<select name="currency" defaultValue={currency} className="fin-input mt-1">{currencies.map((code) => <option key={code} value={code}>{code}</option>)}</select></label>
    <div className="col-span-2 flex flex-wrap items-center gap-2 md:col-span-4 lg:col-span-7"><button className="fin-primary-btn !min-h-9" type="submit">Áp dụng bộ lọc</button><Link href="/reports/analysis" className="fin-secondary-btn !min-h-9">Đặt lại</Link><span className="text-[11px] text-[var(--muted-foreground)]">Chọn ngày để tự chuyển sang khoảng tùy chọn.</span></div>
  </form>;
}
