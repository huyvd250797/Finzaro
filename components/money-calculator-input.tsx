"use client";

import { Backspace, Calculator, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type Operator = "+" | "-" | "*" | "/";

function normalizeCanonical(value: string, decimalDigits: number) {
  const cleaned = value.trim().replace(/\s/g, "").replace(/,/g, ".").replace(/[^\d.]/g, "");
  if (!cleaned) return "";
  const parts = cleaned.split(".");
  let whole = (parts.shift() ?? "0").replace(/^0+(?=\d)/, "");
  if (!whole) whole = "0";
  if (decimalDigits <= 0) return whole;
  const hadDecimal = cleaned.includes(".");
  const fraction = parts.join("").slice(0, decimalDigits);
  return hadDecimal ? `${whole}.${fraction}` : whole;
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
  if (!value) return "0";
  const numeric = canonicalToNumber(value);
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.max(0, decimalDigits)
  }).format(numeric);
}

function calculate(left: number, operator: Operator, right: number) {
  if (operator === "+") return left + right;
  if (operator === "-") return Math.max(0, left - right);
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
  allowEmpty = false
}: {
  name: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  decimalDigits?: number;
  currencyCode?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  allowEmpty?: boolean;
}) {
  const controlled = value !== undefined;
  const initial = normalizeCanonical(controlled ? value ?? "" : defaultValue, decimalDigits);
  const [internalValue, setInternalValue] = useState(initial);
  const [entry, setEntry] = useState(initial);
  const [open, setOpen] = useState(false);
  const [accumulator, setAccumulator] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [expression, setExpression] = useState("");
  const currentValue = controlled ? normalizeCanonical(value ?? "", decimalDigits) : internalValue;

  useEffect(() => {
    if (!controlled) return;
    const normalized = normalizeCanonical(value ?? "", decimalDigits);
    setEntry(normalized);
  }, [controlled, value, decimalDigits]);

  const displayValue = useMemo(() => currentValue ? formatMoney(currentValue, decimalDigits) : "", [currentValue, decimalDigits]);

  function emit(next: string) {
    const normalized = normalizeCanonical(next, decimalDigits);
    if (!controlled) setInternalValue(normalized);
    setEntry(normalized);
    onValueChange?.(normalized);
  }

  function digit(value: string) {
    const base = entry || "";
    let next = base === "0" ? value : `${base}${value}`;
    if (next.replace(/\D/g, "").length > 15) return;
    emit(next);
  }

  function zeros() {
    if (!entry) return emit("0");
    if (entry.replace(/\D/g, "").length > 12) return;
    emit(`${entry}000`);
  }

  function doubleZero() {
    if (!entry) return emit("0");
    if (entry.replace(/\D/g, "").length > 13) return;
    emit(`${entry}00`);
  }

  function decimal() {
    if (decimalDigits <= 0 || entry.includes(".")) return;
    const next = entry ? `${entry}.` : "0.";
    if (!controlled) setInternalValue(next);
    setEntry(next);
    onValueChange?.(next);
  }

  function backspace() {
    const next = entry.slice(0, -1);
    if (!next && allowEmpty) {
      if (!controlled) setInternalValue("");
      setEntry("");
      onValueChange?.("");
      return;
    }
    emit(next || "0");
  }

  function clear() {
    setAccumulator(null);
    setOperator(null);
    setExpression("");
    if (allowEmpty) {
      if (!controlled) setInternalValue("");
      setEntry("");
      onValueChange?.("");
    } else emit("0");
  }

  function chooseOperator(nextOperator: Operator) {
    const current = canonicalToNumber(entry || currentValue);
    let nextAccumulator = current;
    if (accumulator !== null && operator) nextAccumulator = calculate(accumulator, operator, current);
    setAccumulator(nextAccumulator);
    setOperator(nextOperator);
    setExpression(`${formatMoney(numberToCanonical(nextAccumulator, decimalDigits), decimalDigits)} ${operatorLabel[nextOperator]}`);
    setEntry("");
  }

  function equals() {
    if (accumulator === null || !operator || !entry) return;
    const right = canonicalToNumber(entry);
    const result = calculate(accumulator, operator, right);
    const canonical = numberToCanonical(result, decimalDigits);
    setExpression(`${formatMoney(numberToCanonical(accumulator, decimalDigits), decimalDigits)} ${operatorLabel[operator]} ${formatMoney(entry, decimalDigits)} =`);
    setAccumulator(null);
    setOperator(null);
    emit(canonical);
  }

  const keys: Array<{ label: string; onClick: () => void; tone?: string }> = [
    { label: "7", onClick: () => digit("7") },
    { label: "8", onClick: () => digit("8") },
    { label: "9", onClick: () => digit("9") },
    { label: "÷", onClick: () => chooseOperator("/"), tone: "operator" },
    { label: "4", onClick: () => digit("4") },
    { label: "5", onClick: () => digit("5") },
    { label: "6", onClick: () => digit("6") },
    { label: "×", onClick: () => chooseOperator("*"), tone: "operator" },
    { label: "1", onClick: () => digit("1") },
    { label: "2", onClick: () => digit("2") },
    { label: "3", onClick: () => digit("3") },
    { label: "−", onClick: () => chooseOperator("-"), tone: "operator" },
    { label: "000", onClick: zeros },
    { label: "0", onClick: () => digit("0") },
    { label: decimalDigits > 0 ? "," : "00", onClick: decimalDigits > 0 ? decimal : doubleZero },
    { label: "+", onClick: () => chooseOperator("+"), tone: "operator" }
  ];

  return (
    <div className={cn("min-w-0", className)}>
      <input type="hidden" name={name} value={currentValue} required={required} />
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="fin-input flex items-center gap-3 text-left"
        aria-expanded={open}
      >
        <Calculator className="size-4 shrink-0 text-[var(--primary)]" />
        <span className={cn("min-w-0 flex-1 truncate text-base font-black tabular-nums", !displayValue && "font-normal text-[var(--muted-foreground)]")}>
          {displayValue || placeholder}
        </span>
        {currencyCode && <span className="shrink-0 text-[10px] font-black text-[var(--muted-foreground)]">{currencyCode}</span>}
        {open ? <ChevronUp className="size-4 shrink-0 text-[var(--muted-foreground)]" /> : <ChevronDown className="size-4 shrink-0 text-[var(--muted-foreground)]" />}
      </button>

      {open && (
        <div className="mt-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-xl shadow-black/10">
          <div className="mb-3 rounded-xl bg-[var(--muted)] px-3 py-2.5 text-right">
            <p className="min-h-4 truncate text-[10px] font-bold text-[var(--muted-foreground)]">{expression || "Máy tính số tiền"}</p>
            <p className="mt-1 truncate text-xl font-black tabular-nums">{entry ? formatMoney(entry, decimalDigits) : "0"}{currencyCode ? ` ${currencyCode}` : ""}</p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {keys.map((key, index) => (
              <button
                key={`${key.label}-${index}`}
                type="button"
                onClick={key.onClick}
                className={cn(
                  "h-11 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm font-black transition active:scale-[.97]",
                  key.tone === "operator" && "bg-[var(--sidebar-accent)] text-[var(--primary)]"
                )}
              >
                {key.label}
              </button>
            ))}
            <button type="button" onClick={clear} className="h-11 rounded-xl border border-rose-500/20 bg-rose-500/[.07] text-xs font-black text-rose-500">C</button>
            <button type="button" onClick={backspace} className="grid h-11 place-items-center rounded-xl border border-[var(--border)] bg-[var(--background)]"><Backspace className="size-4" /></button>
            <button type="button" onClick={() => setOpen(false)} className="h-11 rounded-xl border border-[var(--border)] bg-[var(--background)] text-xs font-black">Xong</button>
            <button type="button" onClick={equals} className="h-11 rounded-xl bg-[var(--primary)] text-lg font-black text-white">=</button>
          </div>
          <p className="mt-2 text-[10px] leading-4 text-[var(--muted-foreground)]">Có thể cộng/trừ/nhân/chia nhiều khoản ngay tại đây. Ví dụ 10.000 + 20.000 = 30.000.</p>
        </div>
      )}
    </div>
  );
}
