export function AuthMessage({ error, message }: { error?: string; message?: string }) {
  if (!error && !message) return null;

  return (
    <div
      role="status"
      className={`mt-5 rounded-xl border px-4 py-3 text-sm leading-6 ${
        error
          ? "border-rose-500/20 bg-rose-500/8 text-rose-700 dark:text-rose-300"
          : "border-emerald-500/20 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300"
      }`}
    >
      {error ?? message}
    </div>
  );
}
