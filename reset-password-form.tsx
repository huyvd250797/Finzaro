"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { writeAudit } from "@/lib/audit";

const schema = z.object({
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự").regex(/[A-Za-z]/, "Cần ít nhất 1 chữ cái").regex(/[0-9]/, "Cần ít nhất 1 chữ số"),
  confirmPassword: z.string()
}).refine((value) => value.password === value.confirmPassword, { message: "Mật khẩu xác nhận chưa khớp", path: ["confirmPassword"] });

type FormValues = z.infer<typeof schema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ password }: FormValues) => {
    setServerError("");
    const supabase = createClient();
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) {
      setServerError(error.message);
      return;
    }
    if (data.user) {
      await writeAudit(supabase, { actorUserId: data.user.id, action: "security.password_updated", entityType: "user", entityId: data.user.id });
    }
    router.replace("/");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <Field label="Mật khẩu mới" error={errors.password?.message}>
        <Input type="password" autoComplete="new-password" {...register("password")} />
      </Field>
      <Field label="Nhập lại mật khẩu" error={errors.confirmPassword?.message}>
        <Input type="password" autoComplete="new-password" {...register("confirmPassword")} />
      </Field>
      {serverError ? <div className="rounded-xl border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">{serverError}</div> : null}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Đang cập nhật…" : "Đặt mật khẩu mới"}
      </Button>
    </form>
  );
}
