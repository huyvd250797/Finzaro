"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { writeAudit } from "@/lib/audit";

const schema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự")
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError("");
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      setServerError("Không thể đăng nhập. Hãy kiểm tra email và mật khẩu.");
      return;
    }
    if (data.user) {
      await writeAudit(supabase, { actorUserId: data.user.id, action: "auth.login", entityType: "session" });
    }
    const next = searchParams.get("next");
    router.replace(next?.startsWith("/") ? next : "/");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <Field label="Email" error={errors.email?.message}>
        <Input autoComplete="email" inputMode="email" placeholder="ban@example.com" {...register("email")} />
      </Field>
      <Field label="Mật khẩu" error={errors.password?.message}>
        <Input type="password" autoComplete="current-password" placeholder="••••••••" {...register("password")} />
      </Field>
      {serverError ? <div className="rounded-xl border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">{serverError}</div> : null}
      <Button type="submit" disabled={isSubmitting} className="mt-1 w-full">
        {isSubmitting ? "Đang đăng nhập…" : "Đăng nhập"}
      </Button>
      <div className="flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="font-medium text-primary hover:underline">Quên mật khẩu?</Link>
        <Link href="/signup" className="font-medium text-primary hover:underline">Tạo tài khoản</Link>
      </div>
    </form>
  );
}
