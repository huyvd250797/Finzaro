"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isCategoryIconColor, isCategoryIconName } from "@/features/categories/icons";
import { isCategoryType, type CategoryType } from "@/features/categories/constants";
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
    const iconColor = text(formData, "icon_color") || "#0d8b66";
    const parentId = text(formData, "parent_id") || null;

    if (name.length < 1 || name.length > 80) throw new Error("Tên danh mục phải từ 1 đến 80 ký tự.");
    if (!isCategoryType(categoryType)) throw new Error("Loại danh mục không hợp lệ.");
    if (!isCategoryIconName(iconName)) throw new Error("Icon không hợp lệ.");
    if (!isCategoryIconColor(iconColor)) throw new Error("Màu icon không hợp lệ.");

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Historical dynamic Supabase table/RPC adapter; update generated DB types in a schema release.
    const { error } = await (supabase as any).from("categories").insert({
      user_id: userId,
      name,
      category_type: categoryType,
      parent_id: parentId,
      icon_name: iconName,
      icon_color: iconColor
    });
    if (error) throw new Error(safeMessage(error, "Không thể tạo danh mục."));

    revalidatePath("/categories");
    revalidatePath("/transactions");
    revalidatePath("/overview");
    revalidatePath("/reports");
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
    const iconColor = text(formData, "icon_color") || "#0d8b66";
    const parentId = text(formData, "parent_id") || null;
    if (name.length < 1 || name.length > 80) throw new Error("Tên danh mục phải từ 1 đến 80 ký tự.");
    if (!isCategoryIconName(iconName)) throw new Error("Icon không hợp lệ.");
    if (!isCategoryIconColor(iconColor)) throw new Error("Màu icon không hợp lệ.");
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Historical dynamic Supabase table/RPC adapter; update generated DB types in a schema release.
      .update({ name, icon_name: iconName, icon_color: iconColor, parent_id: parentId } as any)
      .eq("id", categoryId)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();
    if (error || !data) throw new Error(safeMessage(error, "Không thể cập nhật danh mục."));

    revalidatePath("/categories");
    revalidatePath("/transactions");
    revalidatePath("/overview");
    revalidatePath("/reports");
    redirect(destination("message", "Đã cập nhật danh mục. Giao dịch cũ dùng danh mục này sẽ hiển thị tên/icon/màu mới."));
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


export async function reorderCategoriesAction(categoryType: CategoryType, orderedIds: string[]) {
  if (!isCategoryType(categoryType)) throw new Error("Loại danh mục không hợp lệ.");
  const ids = Array.from(new Set(orderedIds.filter((id) => /^[0-9a-f-]{36}$/i.test(id))));
  if (ids.length === 0 || ids.length > 200) throw new Error("Danh sách sắp xếp không hợp lệ.");

  const { supabase, userId } = await requireUser();
  const { data: rows, error } = await supabase
    .from("categories")
    .select("id, category_type, is_archived, sort_order")
    .eq("user_id", userId)
    .eq("category_type", categoryType)
    .eq("is_archived", false)
    .in("id", ids);
  if (error) throw new Error("Không thể kiểm tra danh mục trước khi sắp xếp.");
  if ((rows ?? []).length !== ids.length) throw new Error("Danh sách sắp xếp chứa danh mục không hợp lệ hoặc đã lưu trữ.");

  const ownedIds = new Set((rows ?? []).map((row) => row.id));
  if (ids.some((id) => !ownedIds.has(id))) throw new Error("Không thể sắp xếp danh mục không thuộc tài khoản.");

  const oldOrder = new Map((rows ?? []).map((row) => [row.id, row.sort_order]));
  const updates = await Promise.all(ids.map((id, index) =>
    supabase.from("categories").update({ sort_order: (index + 1) * 10 }).eq("id", id).eq("user_id", userId)
  ));
  if (updates.some((result) => result.error)) {
    // Best-effort compensation: do not silently accept a partially saved order.
    await Promise.allSettled(ids.map((id) =>
      supabase.from("categories").update({ sort_order: oldOrder.get(id) ?? 0 }).eq("id", id).eq("user_id", userId)
    ));
    revalidatePath("/categories");
    throw new Error("Không thể lưu toàn bộ thứ tự danh mục. Vui lòng tải lại trang.");
  }

  revalidatePath("/categories");
  revalidatePath("/transactions");
  return { ok: true };
}


// V4.5.2: category editor mutations return structured results instead of redirects,
// so a modal can update only the affected card without a page navigation.
export type InlineCategoryInput = {
  id?: string;
  category_type: CategoryType;
  name: string;
  icon_name: string;
  icon_color: string;
  parent_id: string | null;
};
export type InlineCategoryResult =
  | { ok: true; category: import("@/features/categories/data").CategoryRow }
  | { ok: false; error: string };

export async function saveCategoryInlineAction(input: InlineCategoryInput): Promise<InlineCategoryResult> {
  try {
    const name = input.name.trim();
    const parentId = input.parent_id || null;
    if (!isCategoryType(input.category_type)) throw new Error("Loại danh mục không hợp lệ.");
    if (name.length < 1 || name.length > 80) throw new Error("Tên danh mục phải từ 1 đến 80 ký tự.");
    if (!isCategoryIconName(input.icon_name)) throw new Error("Icon không hợp lệ.");
    if (!isCategoryIconColor(input.icon_color)) throw new Error("Màu icon không hợp lệ.");
    if (parentId && parentId === input.id) throw new Error("Danh mục không thể là danh mục cha của chính nó.");

    const { supabase, userId } = await requireUser();
    if (input.id) {
      const { data: existing, error: existingError } = await supabase.from("categories")
        .select("id, category_type").eq("id", input.id).eq("user_id", userId).maybeSingle();
      if (existingError || !existing || existing.category_type !== input.category_type) throw new Error("Danh mục không hợp lệ hoặc không thuộc tài khoản.");
    }
    if (parentId) {
      const { data: parent, error } = await supabase.from("categories")
        .select("id, category_type, is_archived, parent_id").eq("id", parentId).eq("user_id", userId).maybeSingle();
      if (error || !parent || parent.is_archived || parent.category_type !== input.category_type)
        throw new Error("Danh mục cha không hợp lệ.");
      if (parent.parent_id === input.id) throw new Error("Không thể tạo vòng lặp danh mục cha/con.");
    }
    const fields = { name, icon_name: input.icon_name, icon_color: input.icon_color, parent_id: parentId };
    let saved;
    if (input.id) {
      const result = await supabase.from("categories").update(fields)
        .eq("id", input.id).eq("user_id", userId).eq("category_type", input.category_type)
        .select("id,user_id,name,category_type,parent_id,icon_name,icon_color,system_key,is_system,is_archived,sort_order,created_at,updated_at").maybeSingle();
      if (result.error || !result.data) throw new Error(safeMessage(result.error, "Không thể cập nhật danh mục."));
      saved = result.data;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Database type generator omits legacy category inserts.
      const result = await (supabase as any).from("categories")
        .insert({ ...fields, user_id: userId, category_type: input.category_type })
        .select("id,user_id,name,category_type,parent_id,icon_name,icon_color,system_key,is_system,is_archived,sort_order,created_at,updated_at").single();
      if (result.error || !result.data) throw new Error(safeMessage(result.error, "Không thể tạo danh mục."));
      saved = result.data;
    }
    revalidatePath("/categories");
    revalidatePath("/transactions");
    revalidatePath("/overview");
    revalidatePath("/reports");
    return { ok: true, category: saved as import("@/features/categories/data").CategoryRow };
  } catch (error) {
    return { ok: false, error: safeMessage(error, error instanceof Error ? error.message : "Không thể lưu danh mục.") };
  }
}

export async function archiveCategoryInlineAction(id: string, archived: boolean): Promise<InlineCategoryResult> {
  try {
    const { supabase, userId } = await requireUser();
    if (archived) {
      const { count, error } = await supabase.from("categories").select("id", { count: "exact", head: true })
        .eq("user_id", userId).eq("parent_id", id).eq("is_archived", false);
      if (error) throw error;
      if ((count ?? 0) > 0) throw new Error("Hãy lưu trữ danh mục con trước.");
    }
    const { data, error } = await supabase.from("categories").update({ is_archived: archived })
      .eq("id", id).eq("user_id", userId)
      .select("id,user_id,name,category_type,parent_id,icon_name,icon_color,system_key,is_system,is_archived,sort_order,created_at,updated_at").maybeSingle();
    if (error || !data) throw new Error(error?.message?.includes("Pause recurring rules")
      ? "Danh mục đang được dùng bởi lịch định kỳ. Hãy tạm dừng lịch trước khi lưu trữ."
      : safeMessage(error, "Không thể thay đổi trạng thái danh mục."));
    revalidatePath("/categories");
    revalidatePath("/transactions");
    revalidatePath("/overview");
    revalidatePath("/reports");
    return { ok: true, category: data as import("@/features/categories/data").CategoryRow };
  } catch (error) {
    return { ok: false, error: safeMessage(error, error instanceof Error ? error.message : "Không thể thay đổi trạng thái.") };
  }
}
