import Link from "next/link";
import { Settings } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { InstallButton } from "@/components/pwa/install-button";
import { Button } from "@/components/ui/button";

export function TopBar({ displayName }: { displayName: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur md:px-6">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">Xin chào</p>
        <p className="truncate text-sm font-semibold">{displayName}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <InstallButton />
        <ThemeToggle />
        <Button asChild variant="ghost" size="sm" className="size-11 px-0" aria-label="Cài đặt">
          <Link href="/settings"><Settings className="size-5" /></Link>
        </Button>
      </div>
    </header>
  );
}
