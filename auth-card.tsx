import Link from "next/link";
import { Landmark, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";

export function AuthCard({
  title,
  description,
  children,
  footer
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2 font-semibold tracking-tight">
          <span className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Landmark className="size-5" />
          </span>
          <span>Finzaro</span>
        </Link>
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/50 px-5 py-4">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5 text-positive" />
              Secure account foundation
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
          <div className="p-5">{children}</div>
          {footer ? <div className="border-t bg-muted/30 px-5 py-4 text-center text-sm text-muted-foreground">{footer}</div> : null}
        </Card>
        <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
          Finzaro · Không lưu CVV, PIN hoặc mật khẩu ngân hàng.
        </p>
      </div>
    </main>
  );
}
