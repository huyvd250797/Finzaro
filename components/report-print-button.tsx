"use client";
import { Printer } from "lucide-react";
export function ReportPrintButton() { return <button type="button" onClick={() => window.print()} className="fin-primary-btn print:hidden"><Printer className="size-4" /> In / Lưu PDF</button>; }
