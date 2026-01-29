import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const ORDER_COOKIE = "order_token";

export async function GET(req: NextRequest) {
	const token = req.cookies.get(ORDER_COOKIE)?.value;
	if (!token) return NextResponse.json({ items: [] });
	const db = getDb();
	const orders = db.prepare(`
		SELECT id, created_at, created_to, total_price, status, customer_name, customer_phone, customer_address
		FROM orders
		WHERE client_token = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
		ORDER BY id ASC
	`).all(token) as Array<{ id: number; created_at: string; created_to: string; total_price: number; status: string; customer_name?: string; customer_phone?: string; customer_address?: string }>;
	const getItems = db.prepare(`
		SELECT oi.product_id as id, p.name, p.image, oi.quantity, oi.price
		FROM order_items oi
		JOIN products p ON p.id = oi.product_id
		WHERE oi.order_id = ?
		ORDER BY oi.id ASC
	`);
	const result = orders.map(o => ({
		id: o.id,
		createdAt: o.created_at,
		created_to: o.created_to,
		status: o.status,
		customer_name: o.customer_name ?? null,
		customer_phone: o.customer_phone ?? null,
		customer_address: o.customer_address ?? null,
		items: getItems.all(o.id),
		total: o.total_price
	}));
	return NextResponse.json({ items: result });
}


