export default function Loading() {
  return (
    <div className="grid min-h-[70dvh] place-items-center px-6">
      <div className="text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--sidebar-accent)] text-[var(--primary)] shadow-sm">
          <div className="size-5 animate-spin rounded-full border-2 border-current border-r-transparent" />
        </div>
        <p className="mt-4 text-sm font-black">Đang tải Finzaro...</p>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">Đồng bộ dữ liệu tài chính an toàn</p>
      </div>
    </div>
  );
}
