"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({ email: z.string().email("Email không hợp lệ") });
type FormValues = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email }: FormValues) => {
    setServerError("");
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`
    });
    if (error) {
      setServerError(error.message);
      return;
    }
    setMessage("Nếu email tồn tại, bạn sẽ nhận được liên kết đặt lại mật khẩu.");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <Field label="Email" error={errors.email?.message}>
        <Input autoComplete="email" inputMode="email" placeholder="ban@example.com" {...register("email")} />
      </Field>
      {serverError ? <div className="rounded-xl border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">{serverError}</div> : null}
      {message ? <div className="rounded-xl border border-positive/20 bg-positive/5 px-3 py-2 text-sm text-positive">{message}</div> : null}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Đang gửi…" : "Gửi liên kết khôi phục"}
      </Button>
    </form>
  );
}
