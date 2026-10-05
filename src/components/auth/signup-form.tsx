"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  displayName: z.string().min(2, "Nhập tên hiển thị").max(80),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự").regex(/[A-Za-z]/, "Cần ít nhất 1 chữ cái").regex(/[0-9]/, "Cần ít nhất 1 chữ số")
});

type FormValues = z.infer<typeof schema>;

export function SignupForm() {
  const [message, setMessage] = useState("");
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError("");
    setMessage("");
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
        data: { display_name: values.displayName }
      }
    });
    if (error) {
      setServerError(error.message);
      return;
    }
    if (data.session) {
      window.location.href = "/";
      return;
    }
    setMessage("Tài khoản đã được tạo. Kiểm tra email để xác nhận đăng ký.");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <Field label="Tên hiển thị" error={errors.displayName?.message}>
        <Input autoComplete="name" placeholder="Nguyễn An" {...register("displayName")} />
      </Field>
      <Field label="Email" error={errors.email?.message}>
        <Input autoComplete="email" inputMode="email" placeholder="ban@example.com" {...register("email")} />
      </Field>
      <Field label="Mật khẩu" error={errors.password?.message} hint="Tối thiểu 8 ký tự, gồm chữ và số.">
        <Input type="password" autoComplete="new-password" placeholder="••••••••" {...register("password")} />
      </Field>
      {serverError ? <div className="rounded-xl border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">{serverError}</div> : null}
      {message ? <div className="rounded-xl border border-positive/20 bg-positive/5 px-3 py-2 text-sm text-positive">{message}</div> : null}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
      </Button>
    </form>
  );
}
