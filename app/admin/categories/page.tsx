export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentAdminFromCookies } from "@/lib/auth";
import AdminCategoriesTable from "@/components/AdminCategoriesTable";
import Link from "next/link";

export default function AdminCategoriesPage() {
	const admin = getCurrentAdminFromCookies();
	if (!admin) {
		redirect("/login");
	}
	return (
		<div>
			<div className="mb-2 flex justify-start">
				<Link href="/admin/products" className="px-3 py-2 border rounded hover:bg-gray-100">Редактировать товары</Link>
			</div>
			<h1 className="text-2xl font-semibold mb-4">Категории</h1>
			<AdminCategoriesTable />
		</div>
	);
}


