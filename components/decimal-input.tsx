"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

function normalize(value: string, maxDecimals = 4, allowNegative = false) {
  let raw = value.replace(/,/g, ".").replace(/\s/g, "");
  const negative = allowNegative && raw.startsWith("-");
  raw = raw.replace(/[^\d.]/g, "");
  const [whole = "", ...rest] = raw.split(".");
  const fraction = rest.join("").slice(0, maxDecimals);
  const hadDot = raw.includes(".");
  return `${negative ? "-" : ""}${whole}${hadDot ? `.${fraction}` : ""}`;
}

export function DecimalInput({ name, defaultValue = "", value, onValueChange, className, placeholder, required, min, max, maxDecimals = 4, allowNegative = false }: {
  name?: string;
  defaultValue?: string | number;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  maxDecimals?: number;
  allowNegative?: boolean;
}) {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(normalize(String(defaultValue), maxDecimals, allowNegative));
  const current = controlled ? normalize(value ?? "", maxDecimals, allowNegative) : internal;
  return <input
    name={name}
    value={current}
    inputMode="decimal"
    required={required}
    placeholder={placeholder}
    min={min}
    max={max}
    onChange={(event) => {
      const next = normalize(event.target.value, maxDecimals, allowNegative);
      if (!controlled) setInternal(next);
      onValueChange?.(next);
    }}
    className={cn("fin-input", className)}
  />;
}
