"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { writeAudit } from "@/lib/audit";

const schema = z.object({
  displayName: z.string().min(2, "Tên quá ngắn").max(80),
  baseCurrency: z.string().length(3, "Mã tiền tệ gồm 3 ký tự").transform((value) => value.toUpperCase()),
  timezone: z.string().min(1)
});

type FormValues = z.infer<typeof schema>;

export function ProfileForm({ userId, initial }: { userId: string; initial: { displayName: string; baseCurrency: string; timezone: string } }) {
  const [message, setMessage] = useState("");
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial
  });

  const onSubmit = async (values: FormValues) => {
    setMessage("");
    setServerError("");
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({
      display_name: values.displayName,
      base_currency: values.baseCurrency,
      timezone: values.timezone,
      updated_at: new Date().toISOString()
    }).eq("id", userId);
    if (error) {
      setServerError(error.message);
      return;
    }
    await writeAudit(supabase, { actorUserId: userId, action: "profile.updated", entityType: "profile", entityId: userId });
    setMessage("Đã lưu hồ sơ.");
  };

  return (
    <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
      <Field label="Tên hiển thị" error={errors.displayName?.message}><Input {...register("displayName")} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tiền tệ cơ sở" error={errors.baseCurrency?.message} hint="Ví dụ: VND, USD"><Input maxLength={3} className="uppercase" {...register("baseCurrency")} /></Field>
        <Field label="Múi giờ" error={errors.timezone?.message}><Input {...register("timezone")} /></Field>
      </div>
      {serverError ? <p className="text-sm text-danger">{serverError}</p> : null}
      {message ? <p className="text-sm text-positive">{message}</p> : null}
      <Button type="submit" disabled={isSubmitting} className="w-fit">{isSubmitting ? "Đang lưu…" : "Lưu hồ sơ"}</Button>
    </form>
  );
}
