"use client";

import * as ToastPrimitive from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastMessage = { title: string; description?: string };
type ToastContextValue = { toast: (message: ToastMessage) => void };
const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<ToastMessage | null>(null);
  const [open, setOpen] = useState(false);
  const toast = useCallback((next: ToastMessage) => { setMessage(next); setOpen(false); requestAnimationFrame(() => setOpen(true)); }, []);
  const value = useMemo(() => ({ toast }), [toast]);
  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider swipeDirection="right" duration={3500}>
        {children}
        <ToastPrimitive.Root open={open} onOpenChange={setOpen} className="grid grid-cols-[1fr_auto] gap-x-3 rounded-2xl border bg-card p-4 shadow-xl">
          <div>
            <ToastPrimitive.Title className="text-sm font-semibold">{message?.title}</ToastPrimitive.Title>
            {message?.description ? <ToastPrimitive.Description className="mt-1 text-xs leading-5 text-muted-foreground">{message.description}</ToastPrimitive.Description> : null}
          </div>
          <ToastPrimitive.Close className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted" aria-label="Đóng"><X className="size-4" /></ToastPrimitive.Close>
        </ToastPrimitive.Root>
        <ToastPrimitive.Viewport className="fixed bottom-24 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 outline-none md:bottom-4" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside ToastProvider");
  return value;
}
