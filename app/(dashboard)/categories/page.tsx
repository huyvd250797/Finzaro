import { CategoryManagerGrid } from "@/components/category-manager-grid";
import { loadCategories } from "@/features/categories/data";
import { isCategoryType } from "@/features/categories/constants";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Danh mục" };

type SearchParams = Promise<{ type?: string; show?: string }>;

export default async function CategoriesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { supabase, userId } = await requireUser();
  const categories = await loadCategories(supabase, userId, true);
  const initialType = params.type && isCategoryType(params.type) ? params.type : "expense";
  return <div className="fin-page-shell mx-auto max-w-[1300px] px-4 py-6 md:px-6 lg:px-8 lg:py-8">
    <header className="mb-5"><h1 className="text-2xl font-black tracking-tight sm:text-3xl">Danh mục</h1></header>
    <CategoryManagerGrid categories={categories} initialType={initialType} initialArchived={params.show === "archived"}/>
  </div>;
}
