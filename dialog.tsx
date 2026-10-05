"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({ className, children, title, description }: { className?: string; children: React.ReactNode; title: string; description?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[2px]" />
      <DialogPrimitive.Content className={cn("fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card p-5 shadow-2xl outline-none", className)}>
        <div className="pr-9">
          <DialogPrimitive.Title className="text-lg font-bold">{title}</DialogPrimitive.Title>
          {description ? <DialogPrimitive.Description className="mt-1 text-sm leading-6 text-muted-foreground">{description}</DialogPrimitive.Description> : null}
        </div>
        <DialogPrimitive.Close className="absolute right-3 top-3 grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted" aria-label="Đóng"><X className="size-4" /></DialogPrimitive.Close>
        <div className="mt-5">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function BottomSheetContent({ children, title, description }: { children: React.ReactNode; title: string; description?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[2px]" />
      <DialogPrimitive.Content className="safe-bottom fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-auto rounded-t-3xl border border-b-0 bg-card p-5 shadow-2xl outline-none md:left-1/2 md:right-auto md:w-full md:max-w-lg md:-translate-x-1/2">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border md:hidden" />
        <div className="pr-9">
          <DialogPrimitive.Title className="text-lg font-bold">{title}</DialogPrimitive.Title>
          {description ? <DialogPrimitive.Description className="mt-1 text-sm leading-6 text-muted-foreground">{description}</DialogPrimitive.Description> : null}
        </div>
        <DialogPrimitive.Close className="absolute right-3 top-4 grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted" aria-label="Đóng"><X className="size-4" /></DialogPrimitive.Close>
        <div className="mt-5">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
