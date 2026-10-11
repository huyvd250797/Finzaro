"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

type Props = { children: ReactNode };
type State = { failed: boolean };

export class ReportVisualBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Finzaro Reports] visualization recovered", error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[.035] p-5 text-center">
          <AlertTriangle className="mx-auto size-5 text-amber-500" />
          <p className="mt-2 text-sm font-black">Biểu đồ tạm thời không hiển thị</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">Số liệu và danh sách danh mục bên cạnh vẫn hoạt động bình thường.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
