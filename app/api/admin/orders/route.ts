import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
	const admin = await getCurrentAdmin(req);
	if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const db = getDb();
	const rows = db.prepare(`
		SELECT
			o.id, o.created_at AS createdAt, o.created_to AS createdTo, o.total_price AS total,
			o.status, o.customer_name AS name, o.customer_phone AS phone, o.customer_address AS address
		FROM orders o
		ORDER BY o.created_at DESC, o.id DESC
	`).all();

	const getItems = db.prepare(`
		SELECT oi.id AS itemId, p.name AS name, oi.quantity AS quantity, COALESCE(oi.checked, 0) AS checked
		FROM order_items oi
		JOIN products p ON p.id = oi.product_id
		WHERE oi.order_id = ?
		ORDER BY oi.id ASC
	`);
	const withItems = rows.map((o: any) => ({
		...o,
		items: getItems.all(o.id)
	}));

	return NextResponse.json({ items: withItems });
}
