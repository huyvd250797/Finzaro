import { AlertTriangle, Inbox, LoaderCircle } from "lucide-react";

export function LoadingState({ label = "Đang tải…" }: { label?: string }) {
  return <div className="flex items-center justify-center gap-2 rounded-2xl border bg-card p-8 text-sm text-muted-foreground"><LoaderCircle className="size-5 animate-spin" />{label}</div>;
}

export function EmptyState({ title = "Chưa có dữ liệu", description }: { title?: string; description?: string }) {
  return <div className="rounded-2xl border bg-card p-8 text-center"><Inbox className="mx-auto size-7 text-muted-foreground" /><p className="mt-3 font-semibold">{title}</p>{description ? <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">{description}</p> : null}</div>;
}

export function ErrorState({ title = "Không thể tải dữ liệu", description }: { title?: string; description?: string }) {
  return <div className="rounded-2xl border border-danger/20 bg-danger/5 p-5"><div className="flex gap-3"><AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" /><div><p className="font-semibold text-danger">{title}</p>{description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p> : null}</div></div></div>;
}
