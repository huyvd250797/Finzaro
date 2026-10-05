"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="size-11" aria-hidden />;
  const dark = resolvedTheme === "dark";
  return (
    <Button variant="ghost" size="sm" className="size-11 px-0" onClick={() => setTheme(dark ? "light" : "dark")} aria-label="Đổi giao diện sáng tối">
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  );
}
