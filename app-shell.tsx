import { BottomNav } from "@/components/shell/bottom-nav";
import { SideNav } from "@/components/shell/side-nav";
import { TopBar } from "@/components/shell/top-bar";

export function AppShell({ displayName, children }: { displayName: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh md:flex">
      <SideNav />
      <div className="min-w-0 flex-1">
        <TopBar displayName={displayName} />
        <main className="mx-auto w-full max-w-6xl px-4 py-5 pb-28 md:px-6 md:pb-8">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
