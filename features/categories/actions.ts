"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isCategoryIconName } from "@/features/categories/icons";
import { isCategoryType } from "@/features/categories/constants";
import { requireUser } from "@/lib/auth";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function destination(kind: "error" | "message", message: string) {
  return `/categories?${new URLSearchParams({ [kind]: message }).toString()}`;
}

function safeMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== "object") return fallback;
  const message = "message" in error ? String(error.message) : "";
  if (/duplicate key|categories_user_.*_name_unique/i.test(message)) return "Tên danh mục này đã tồn tại trong cùng nhóm.";
  if (/Parent category/i.test(message)) return message;
  return fallback;
}

export async function createCategoryAction(formData: FormData) {
  try {
    const name = text(formData, "name");
    const categoryType = text(formData, "category_type");
    const iconName = text(formData, "icon_name");
    const parentId = text(formData, "parent_id") || null;

    if (name.length < 1 || name.length > 80) throw new Error("Tên danh mục phải từ 1 đến 80 ký tự.");
    if (!isCategoryType(categoryType)) throw new Error("Loại danh mục không hợp lệ.");
    if (!isCategoryIconName(iconName)) throw new Error("Icon không hợp lệ.");

    const { supabase, userId } = await requireUser();
    if (parentId) {
      const { data: parent, error } = await supabase
        .from("categories")
        .select("id, category_type, is_archived")
        .eq("id", parentId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error || !parent || parent.is_archived || parent.category_type !== categoryType) {
        throw new Error("Danh mục cha không hợp lệ.");
      }
    }

    const { error } = await supabase.from("categories").insert({
      user_id: userId,
      name,
      category_type: categoryType,
      parent_id: parentId,
      icon_name: iconName
    });
    if (error) throw new Error(safeMessage(error, "Không thể tạo danh mục."));

    revalidatePath("/categories");
    revalidatePath("/transactions");
    revalidatePath("/overview");
    redirect(destination("message", "Đã tạo danh mục mới."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(destination("error", error instanceof Error ? error.message : "Không thể tạo danh mục."));
  }
}

export async function updateCategoryAction(formData: FormData) {
  const categoryId = text(formData, "category_id");
  if (!categoryId) redirect(destination("error", "Thiếu mã danh mục."));

  try {
    const name = text(formData, "name");
    const iconName = text(formData, "icon_name");
    const parentId = text(formData, "parent_id") || null;
    if (name.length < 1 || name.length > 80) throw new Error("Tên danh mục phải từ 1 đến 80 ký tự.");
    if (!isCategoryIconName(iconName)) throw new Error("Icon không hợp lệ.");
    if (parentId === categoryId) throw new Error("Danh mục không thể là danh mục cha của chính nó.");

    const { supabase, userId } = await requireUser();
    const { data: current, error: currentError } = await supabase
      .from("categories")
      .select("id, category_type")
      .eq("id", categoryId)
      .eq("user_id", userId)
      .maybeSingle();
    if (currentError || !current) throw new Error("Không tìm thấy danh mục.");

    if (parentId) {
      const { data: parent, error } = await supabase
        .from("categories")
        .select("id, category_type, is_archived, parent_id")
        .eq("id", parentId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error || !parent || parent.is_archived || parent.category_type !== current.category_type) {
        throw new Error("Danh mục cha không hợp lệ.");
      }
      if (parent.parent_id === categoryId) throw new Error("Không thể tạo vòng lặp danh mục cha/con.");
    }

    const { data, error } = await supabase
      .from("categories")
      .update({ name, icon_name: iconName, parent_id: parentId })
      .eq("id", categoryId)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();
    if (error || !data) throw new Error(safeMessage(error, "Không thể cập nhật danh mục."));

    revalidatePath("/categories");
    revalidatePath("/transactions");
    revalidatePath("/overview");
    redirect(destination("message", "Đã cập nhật tên, icon và cấu trúc danh mục."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(destination("error", error instanceof Error ? error.message : "Không thể cập nhật danh mục."));
  }
}

export async function setCategoryArchivedAction(formData: FormData) {
  const categoryId = text(formData, "category_id");
  const archived = text(formData, "archived") === "true";
  if (!categoryId) redirect(destination("error", "Thiếu mã danh mục."));

  const { supabase, userId } = await requireUser();
  if (archived) {
    const { count, error: childError } = await supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("parent_id", categoryId)
      .eq("is_archived", false);
    if (childError) redirect(destination("error", "Không thể kiểm tra danh mục con."));
    if ((count ?? 0) > 0) redirect(destination("error", "Hãy lưu trữ các danh mục con trước khi lưu trữ danh mục cha."));
  }

  const { data, error } = await supabase
    .from("categories")
    .update({ is_archived: archived })
    .eq("id", categoryId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    const message = error?.message?.includes("Pause recurring rules")
      ? "Danh mục đang được dùng bởi lịch định kỳ đang hoạt động. Hãy tạm dừng lịch đó trước khi lưu trữ danh mục."
      : "Không thể thay đổi trạng thái danh mục.";
    redirect(destination("error", message));
  }

  revalidatePath("/categories");
  revalidatePath("/transactions");
  revalidatePath("/overview");
  redirect(destination("message", archived ? "Đã lưu trữ danh mục. Giao dịch cũ vẫn giữ lịch sử." : "Đã khôi phục danh mục."));
}
