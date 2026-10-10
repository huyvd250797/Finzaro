"use client";

import { Calculator, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useOverlayScrollLock } from "@/components/use-overlay-scroll-lock";
import { cn } from "@/lib/utils";

type Operator = "+" | "-" | "*" | "/";

function normalizeCanonical(value: string, decimalDigits: number, allowNegative = false) {
  const trimmed = value.trim().replace(/\s/g, "").replace(/,/g, ".");
  const negative = allowNegative && trimmed.startsWith("-");
  const cleaned = trimmed.replace(/[^\d.]/g, "");
  if (!cleaned) return negative ? "-" : "";
  const parts = cleaned.split(".");
  let whole = (parts.shift() ?? "0").replace(/^0+(?=\d)/, "");
  if (!whole) whole = "0";
  if (decimalDigits <= 0) return `${negative ? "-" : ""}${whole}`;
  const hadDecimal = cleaned.includes(".");
  const fraction = parts.join("").slice(0, decimalDigits);
  return `${negative ? "-" : ""}${hadDecimal ? `${whole}.${fraction}` : whole}`;
}

function canonicalToNumber(value: string) {
  const parsed = Number(value || "0");
  return Number.isFinite(parsed) ? parsed : 0;
}

function numberToCanonical(value: number, decimalDigits: number) {
  if (!Number.isFinite(value)) return "";
  const factor = 10 ** Math.max(0, decimalDigits);
  const rounded = Math.round(value * factor) / factor;
  return decimalDigits > 0 ? rounded.toFixed(decimalDigits).replace(/0+$/, "").replace(/\.$/, "") : String(Math.round(rounded));
}

function formatMoney(value: string, decimalDigits: number) {
  if (!value || value === "-") return "0";
  const normalized = normalizeCanonical(value, decimalDigits, true);
  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [whole = "0", fraction] = unsigned.split(".");
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negative ? "-" : ""}${groupedWhole}${fraction !== undefined ? `,${fraction}` : ""}`;
}

function formatPlaceholder(value: string, decimalDigits: number) {
  const match = value.match(/^(\D*)(-?\d[\d.,]*)(\D*)$/);
  if (!match) return value;
  const [, prefix, numeric, suffix] = match;
  return `${prefix}${formatMoney(numeric, decimalDigits)}${suffix}`;
}

function calculate(left: number, operator: Operator, right: number) {
  if (operator === "+") return left + right;
  if (operator === "-") return left - right;
  if (operator === "*") return left * right;
  return right === 0 ? left : left / right;
}

const operatorLabel: Record<Operator, string> = { "+": "+", "-": "−", "*": "×", "/": "÷" };

export function MoneyCalculatorInput({
  name,
  value,
  defaultValue = "",
  onValueChange,
  decimalDigits = 0,
  currencyCode,
  required = false,
  placeholder = "0",
  className,
  allowEmpty = false,
  allowNegative = false
}: {
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  decimalDigits?: number;
  currencyCode?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  allowEmpty?: boolean;
  allowNegative?: boolean;
}) {
  const controlled = value !== undefined;
  const initial = normalizeCanonical(controlled ? value ?? "" : defaultValue, decimalDigits, allowNegative);
  const [internalValue, setInternalValue] = useState(initial);
  const [entry, setEntry] = useState(initial);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [accumulator, setAccumulator] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [expression, setExpression] = useState("");
  const currentValue = controlled ? normalizeCanonical(value ?? "", decimalDigits, allowNegative) : internalValue;
  useOverlayScrollLock(open);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!controlled) return;
    const normalized = normalizeCanonical(value ?? "", decimalDigits, allowNegative);
    setEntry(normalized);
  }, [controlled, value, decimalDigits, allowNegative]);
  useEffect(() => {
    if (!open) return;
    setEntry(currentValue);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, currentValue]);

  const displayValue = useMemo(() => currentValue ? formatMoney(currentValue, decimalDigits) : "", [currentValue, decimalDigits]);
  const displayPlaceholder = useMemo(() => formatPlaceholder(placeholder, decimalDigits), [placeholder, decimalDigits]);

  function emit(next: string) {
    const normalized = normalizeCanonical(next, decimalDigits, allowNegative);
    if (!controlled) setInternalValue(normalized);
    setEntry(normalized);
    onValueChange?.(normalized);
  }

  function digit(value: string) {
    const negative = entry.startsWith("-");
    const unsigned = negative ? entry.slice(1) : entry;
    const nextUnsigned = unsigned === "0" ? value : `${unsigned}${value}`;
    if (nextUnsigned.replace(/\D/g, "").length > 15) return;
    emit(`${negative ? "-" : ""}${nextUnsigned}`);
  }

  function zeros(count: 2 | 3) {
    const negative = entry.startsWith("-");
    const unsigned = negative ? entry.slice(1) : entry;
    if (!unsigned) return emit(`${negative ? "-" : ""}0`);
    if (unsigned.replace(/\D/g, "").length > 15 - count) return;
    emit(`${negative ? "-" : ""}${unsigned}${"0".repeat(count)}`);
  }

  function decimal() {
    if (decimalDigits <= 0 || entry.includes(".")) return;
    const negative = entry.startsWith("-");
    const unsigned = negative ? entry.slice(1) : entry;
    emit(`${negative ? "-" : ""}${unsigned ? `${unsigned}.` : "0."}`);
  }

  function toggleSign() {
    if (!allowNegative) return;
    if (entry.startsWith("-")) emit(entry.slice(1));
    else emit(entry ? `-${entry}` : "-");
  }

  function backspace() {
    const next = entry.slice(0, -1);
    if (!next && allowEmpty) return emit("");
    emit(next || "0");
  }

  function clear() {
    setAccumulator(null);
    setOperator(null);
    setExpression("");
    emit(allowEmpty ? "" : "0");
  }

  function chooseOperator(nextOperator: Operator) {
    // Pressing another operator before entering the next operand should replace
    // the pending operator, not apply the previous operation to the same value.
    if (accumulator !== null && operator && !entry) {
      setOperator(nextOperator);
      setExpression(`${formatMoney(numberToCanonical(accumulator, decimalDigits), decimalDigits)} ${operatorLabel[nextOperator]}`);
      return;
    }

    const current = canonicalToNumber(entry || currentValue);
    let nextAccumulator = current;
    if (accumulator !== null && operator) nextAccumulator = calculate(accumulator, operator, current);
    const committed = numberToCanonical(nextAccumulator, decimalDigits);
    if (!controlled) setInternalValue(committed);
    onValueChange?.(committed);
    setAccumulator(nextAccumulator);
    setOperator(nextOperator);
    setExpression(`${formatMoney(committed, decimalDigits)} ${operatorLabel[nextOperator]}`);
    setEntry("");
  }

  function equals() {
    if (accumulator === null || !operator || !entry || entry === "-") return;
    const right = canonicalToNumber(entry);
    const result = calculate(accumulator, operator, right);
    const canonical = numberToCanonical(result, decimalDigits);
    if (!allowNegative && result < 0) return emit("0");
    setExpression(`${formatMoney(numberToCanonical(accumulator, decimalDigits), decimalDigits)} ${operatorLabel[operator]} ${formatMoney(entry, decimalDigits)} =`);
    setAccumulator(null);
    setOperator(null);
    emit(canonical);
  }

  const keys: Array<{ label: string; onClick: () => void; tone?: string }> = [
    { label: "7", onClick: () => digit("7") }, { label: "8", onClick: () => digit("8") }, { label: "9", onClick: () => digit("9") }, { label: "÷", onClick: () => chooseOperator("/"), tone: "operator" },
    { label: "4", onClick: () => digit("4") }, { label: "5", onClick: () => digit("5") }, { label: "6", onClick: () => digit("6") }, { label: "×", onClick: () => chooseOperator("*"), tone: "operator" },
    { label: "1", onClick: () => digit("1") }, { label: "2", onClick: () => digit("2") }, { label: "3", onClick: () => digit("3") }, { label: "−", onClick: () => chooseOperator("-"), tone: "operator" },
    { label: allowNegative ? "±" : "000", onClick: allowNegative ? toggleSign : () => zeros(3) }, { label: "0", onClick: () => digit("0") }, { label: decimalDigits > 0 ? "." : "00", onClick: decimalDigits > 0 ? decimal : () => zeros(2) }, { label: "+", onClick: () => chooseOperator("+"), tone: "operator" }
  ];

  const sheet = open && mounted ? createPortal(
    <div className="fixed inset-0 z-[140] overflow-hidden" role="dialog" aria-modal="true" aria-label={`Máy tính ${currencyCode ?? "số tiền"}`}>
      <button type="button" aria-label="Đóng máy tính" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />
      <section className="absolute inset-x-0 bottom-0 max-h-[min(78dvh,620px)] overflow-y-auto overscroll-contain rounded-t-[28px] border-t border-[var(--border)] bg-[var(--card)] px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 shadow-2xl animate-[sheet-up_.2s_cubic-bezier(.2,.8,.2,1)] sm:left-1/2 sm:max-w-md sm:-translate-x-1/2 sm:rounded-[28px] sm:border sm:bottom-4">
        <div className="mx-auto h-1.5 w-11 rounded-full bg-[var(--border)]" />
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="min-w-0"><p className="truncate text-sm font-black">Nhập số tiền{currencyCode ? ` · ${currencyCode}` : ""}</p><p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">Tự động nhóm hàng nghìn bằng dấu . · phím . nhập phần thập phân.</p></div>
          <button type="button" onClick={() => setOpen(false)} className="grid size-9 shrink-0 place-items-center rounded-xl border border-[var(--border)]" aria-label="Đóng"><X className="size-4" /></button>
        </div>
        <div className="mt-3 rounded-2xl bg-[var(--muted)] px-3 py-3 text-right">
          <p className="min-h-4 truncate text-[10px] font-bold text-[var(--muted-foreground)]">{expression || "Máy tính số tiền"}</p>
          <p className="mt-1 truncate text-2xl font-black tabular-nums">{entry ? formatMoney(entry, decimalDigits) : "0"}{currencyCode ? ` ${currencyCode}` : ""}</p>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {keys.map((key, index) => <button key={`${key.label}-${index}`} type="button" onClick={key.onClick} className={cn("h-12 rounded-xl border border-[var(--border)] bg-[var(--background)] text-base font-black transition active:scale-[.97]", key.tone === "operator" && "bg-[var(--sidebar-accent)] text-[var(--primary)]")}>{key.label}</button>)}
          <button type="button" onClick={clear} className="h-12 rounded-xl border border-rose-500/20 bg-rose-500/[.07] text-xs font-black text-rose-500">C</button>
          <button type="button" onClick={backspace} aria-label="Xóa một chữ số" className="grid h-12 place-items-center rounded-xl border border-[var(--border)] bg-[var(--background)]"><svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 6H9l-6 6 6 6h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2Z"/><path d="m18 9-6 6"/><path d="m12 9 6 6"/></svg></button>
          <button type="button" onClick={equals} className="h-12 rounded-xl bg-[var(--primary)] text-lg font-black text-white">=</button>
          <button type="button" onClick={() => setOpen(false)} className="h-12 rounded-xl bg-[var(--foreground)] text-sm font-black text-[var(--background)]">Xong</button>
        </div>
      </section>
    </div>, document.body) : null;

  return <div className={cn("min-w-0 max-w-full", className)}>
    {name && <input type="hidden" name={name} value={currentValue} required={required} />}
    <button type="button" onClick={() => setOpen(true)} className="fin-input flex max-w-full items-center gap-3 overflow-hidden text-left" aria-expanded={open}>
      <Calculator className="size-4 shrink-0 text-[var(--primary)]" />
      <span className={cn("min-w-0 flex-1 truncate text-base font-black tabular-nums", !displayValue && "font-normal text-[var(--muted-foreground)]")}>{displayValue || displayPlaceholder}</span>
      {currencyCode && <span className="shrink-0 text-[10px] font-black text-[var(--muted-foreground)]">{currencyCode}</span>}
    </button>
    {sheet}
  </div>;
}
