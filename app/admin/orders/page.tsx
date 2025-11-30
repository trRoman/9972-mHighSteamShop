import { redirect } from "next/navigation";
import { getCurrentAdminFromCookies } from "@/lib/auth";
import AdminOrdersTable from "@/components/AdminOrdersTable";

export default function AdminOrdersPage() {
	const admin = getCurrentAdminFromCookies();
	if (!admin) {
		redirect("/login");
	}
	return (
		<div>
			<h1 className="text-2xl font-semibold mb-4">Заказы</h1>
			<AdminOrdersTable />
		</div>
	);
}
