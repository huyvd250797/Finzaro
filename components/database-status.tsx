"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, Database, LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_VERSION_LABEL } from "@/lib/app-version";

type DatabaseHealth = {
  ok: boolean;
  configured: boolean;
  connected: boolean;
  environment: string;
  latencyMs?: number;
  referenceRows?: number;
  message?: string;
};

type State =
  | { status: "loading" }
  | { status: "ready"; data: DatabaseHealth }
  | { status: "error"; message: string };

export function DatabaseStatus() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setState({ status: "loading" });
      try {
        const response = await fetch("/api/health/database", {
          cache: "no-store",
          signal: controller.signal
        });
        const data = (await response.json()) as DatabaseHealth;
        setState({ status: "ready", data });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Không thể kiểm tra database."
        });
      }
    }

    void load();
    return () => controller.abort();
  }, [refreshKey]);

  const loading = state.status === "loading";
  const connected = state.status === "ready" && state.data.connected;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-[var(--muted)] text-[var(--primary)]">
            <Database className="size-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold">Supabase DEV</h2>
              {loading ? (
                <LoaderCircle className="size-4 animate-spin text-[var(--muted-foreground)]" />
              ) : connected ? (
                <CheckCircle2 className="size-4 text-emerald-500" />
              ) : (
                <CircleAlert className="size-4 text-amber-500" />
              )}
            </div>
            <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
              Runtime health check cho Supabase DEV environment của Finzaro {APP_VERSION_LABEL}.
            </p>
          </div>
        </div>
        <Button
          className="h-9 gap-2"
          disabled={loading}
          onClick={() => setRefreshKey((value) => value + 1)}
        >
          <RefreshCw className="size-4" /> Kiểm tra
        </Button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <StatusItem
          label="Environment"
          value={state.status === "ready" ? state.data.environment.toUpperCase() : "—"}
        />
        <StatusItem
          label="Configuration"
          value={
            state.status === "ready"
              ? state.data.configured
                ? "Configured"
                : "Missing ENV"
              : "—"
          }
        />
        <StatusItem
          label="Database"
          value={
            state.status === "ready"
              ? state.data.connected
                ? `${state.data.latencyMs ?? 0} ms`
                : "Disconnected"
              : "—"
          }
        />
      </div>

      {state.status === "ready" && !state.data.connected ? (
        <p className="mt-4 rounded-xl bg-amber-500/10 px-4 py-3 text-xs leading-5 text-amber-700 dark:text-amber-300">
          {state.data.message ?? "Chưa kết nối được Supabase DEV. Xem docs/SUPABASE_DEV_SETUP.md."}
        </p>
      ) : null}

      {state.status === "error" ? (
        <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-xs leading-5 text-red-700 dark:text-red-300">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--muted)]/65 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-1.5 text-sm font-bold">{value}</p>
    </div>
  );
}
