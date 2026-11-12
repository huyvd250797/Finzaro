"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

/** Follow the operating-system theme until the user explicitly picks one.
 * The boot script in app/layout.tsx applies the same rule before hydration. */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      let saved: string | null = null;
      try { saved = localStorage.getItem("finzaro-theme"); } catch { /* private mode */ }
      const next = saved === "dark" || (saved !== "light" && preference.matches);
      setDark(next);
      document.documentElement.classList.toggle("dark", next);
      document.documentElement.style.colorScheme = next ? "dark" : "light";
    };
    sync();
    preference.addEventListener("change", sync);
    window.addEventListener("storage", sync);
    return () => { preference.removeEventListener("change", sync); window.removeEventListener("storage", sync); };
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.style.colorScheme = next ? "dark" : "light";
    try { localStorage.setItem("finzaro-theme", next ? "dark" : "light"); } catch { /* private mode */ }
  }

  return <button type="button" onClick={toggle} aria-label={dark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"} title={dark ? "Giao diện tối" : "Giao diện sáng"} className="fin-theme-toggle grid size-11 place-items-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)]">
    {dark ? <Sun className="size-4.5" aria-hidden="true" /> : <Moon className="size-4.5" aria-hidden="true" />}
  </button>;
}
