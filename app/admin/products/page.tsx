export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentAdminFromCookies } from "@/lib/auth";
import AdminProductsTable from "@/components/AdminProductsTable";
import Link from "next/link";

export default function AdminProductsPage() {
	const admin = getCurrentAdminFromCookies();
	if (!admin) {
		redirect("/login");
	}
	return (
		<div>
			<div className="mb-2 flex justify-start">
				<Link href="/admin/categories" className="px-3 py-2 border rounded hover:bg-gray-100">Редактировать категории</Link>
			</div>
			<h1 className="text-2xl font-semibold mb-4">Каталог товаров</h1>
			<AdminProductsTable />
		</div>
	);
}


