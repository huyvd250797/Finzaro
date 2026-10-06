"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function destination(path: string, kind: "error" | "message", message: string) {
  const params = new URLSearchParams({ [kind]: message });
  return `${path}?${params.toString()}`;
}

function mapAuthError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return "Email hoặc mật khẩu không đúng.";
  if (normalized.includes("email not confirmed")) return "Vui lòng xác nhận email trước khi đăng nhập.";
  if (normalized.includes("password")) return "Mật khẩu chưa đáp ứng yêu cầu bảo mật.";
  if (normalized.includes("rate limit")) return "Bạn thao tác quá nhanh. Vui lòng thử lại sau.";
  return "Không thể hoàn tất yêu cầu xác thực. Vui lòng thử lại.";
}

async function requestOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured && configured !== "http://localhost:3000") {
    return configured.replace(/\/$/, "");
  }

  const headerStore = await headers();
  const origin = headerStore.get("origin");
  if (origin) return origin.replace(/\/$/, "");

  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

export async function loginAction(formData: FormData) {
  const email = text(formData, "email");
  const password = text(formData, "password");

  if (!isEmail(email) || !password) {
    redirect(destination("/login", "error", "Nhập email và mật khẩu hợp lệ."));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(destination("/login", "error", mapAuthError(error.message)));
  }

  revalidatePath("/", "layout");
  redirect("/overview");
}

export async function registerAction(formData: FormData) {
  const displayName = text(formData, "display_name");
  const email = text(formData, "email");
  const password = text(formData, "password");
  const confirmPassword = text(formData, "confirm_password");

  if (displayName.length < 2 || displayName.length > 100) {
    redirect(destination("/register", "error", "Tên hiển thị phải từ 2 đến 100 ký tự."));
  }
  if (!isEmail(email)) {
    redirect(destination("/register", "error", "Email không hợp lệ."));
  }
  if (password.length < 8) {
    redirect(destination("/register", "error", "Mật khẩu cần ít nhất 8 ký tự."));
  }
  if (password !== confirmPassword) {
    redirect(destination("/register", "error", "Mật khẩu xác nhận không khớp."));
  }

  const origin = await requestOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: `${origin}/auth/confirm?next=/overview`
    }
  });

  if (error) {
    redirect(destination("/register", "error", mapAuthError(error.message)));
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/overview");
  }

  redirect(destination("/login", "message", "Đã tạo tài khoản. Hãy kiểm tra email để xác nhận trước khi đăng nhập."));
}

export async function forgotPasswordAction(formData: FormData) {
  const email = text(formData, "email");

  if (!isEmail(email)) {
    redirect(destination("/forgot-password", "error", "Email không hợp lệ."));
  }

  const origin = await requestOrigin();
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`
  });

  // Deliberately do not disclose whether the email exists.
  redirect(destination("/forgot-password", "message", "Nếu email tồn tại, Finzaro đã gửi liên kết đặt lại mật khẩu."));
}

export async function updatePasswordAction(formData: FormData) {
  const password = text(formData, "password");
  const confirmPassword = text(formData, "confirm_password");

  if (password.length < 8) {
    redirect(destination("/reset-password", "error", "Mật khẩu mới cần ít nhất 8 ký tự."));
  }
  if (password !== confirmPassword) {
    redirect(destination("/reset-password", "error", "Mật khẩu xác nhận không khớp."));
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(destination("/reset-password", "error", mapAuthError(error.message)));
  }

  revalidatePath("/", "layout");
  redirect(destination("/settings", "message", "Mật khẩu đã được cập nhật."));
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect(destination("/login", "message", "Bạn đã đăng xuất khỏi Finzaro."));
}

export async function updateProfileAction(formData: FormData) {
  const displayName = text(formData, "display_name");
  if (displayName.length < 2 || displayName.length > 100) {
    redirect(destination("/settings", "error", "Tên hiển thị phải từ 2 đến 100 ký tự."));
  }

  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("id", userId);

  if (error) {
    redirect(destination("/settings", "error", "Không thể cập nhật hồ sơ."));
  }

  revalidatePath("/", "layout");
  redirect(destination("/settings", "message", "Hồ sơ đã được cập nhật."));
}

export async function updatePreferencesAction(formData: FormData) {
  const currencyCode = text(formData, "currency_code").toUpperCase();
  const locale = text(formData, "locale");
  const timezone = text(formData, "timezone");

  const { supabase, userId } = await requireUser();
  const { data: currency } = await supabase
    .from("supported_currencies")
    .select("code")
    .eq("code", currencyCode)
    .eq("is_active", true)
    .maybeSingle();

  if (!currency || !["vi-VN", "en-US"].includes(locale) || !["Asia/Ho_Chi_Minh", "UTC"].includes(timezone)) {
    redirect(destination("/settings", "error", "Tùy chọn tài chính không hợp lệ."));
  }

  const { error } = await supabase
    .from("user_preferences")
    .update({ currency_code: currencyCode, locale, timezone })
    .eq("id", userId);

  if (error) {
    redirect(destination("/settings", "error", "Không thể cập nhật tùy chọn."));
  }

  revalidatePath("/settings");
  redirect(destination("/settings", "message", "Tùy chọn tài chính đã được lưu."));
}
