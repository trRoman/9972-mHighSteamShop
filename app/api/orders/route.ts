import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

const ORDER_COOKIE = "order_token";

export async function POST(req: NextRequest) {
	const db = getDb();
	const body = await req.json().catch(() => null) as {
		name?: string;
		phone?: string;
		address?: string;
		items?: Array<{ id: number; quantity: number }>;
	} | null;
	if (!body || !body.name || !body.phone || !Array.isArray(body.items) || body.items.length === 0) {
		return NextResponse.json({ error: "Bad request" }, { status: 400 });
	}
	// read or create client token
	let token = req.cookies.get(ORDER_COOKIE)?.value;
	if (!token) token = crypto.randomUUID();
	const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days

	// Recalculate prices from DB
	const getProduct = db.prepare("SELECT id, price, name, image FROM products WHERE id = ?");
	let total = 0;
	const orderItems: Array<{ product_id: number; quantity: number; price: number }> = [];
	for (const it of body.items) {
		const p = getProduct.get(it.id) as { id: number; price: number } | undefined;
		if (!p) continue;
		const qty = Math.max(1, Math.floor(it.quantity || 1));
		total += p.price * qty;
		orderItems.push({ product_id: p.id, quantity: qty, price: p.price });
	}
	if (orderItems.length === 0) {
		return NextResponse.json({ error: "Empty items" }, { status: 400 });
	}
	const tx = db.transaction(() => {
		const info = db.prepare("INSERT INTO orders (total_price, client_token, expires_at, status, customer_name, customer_phone, customer_address) VALUES (?, ?, ?, ?, ?, ?, ?)")
			.run(total, token, expires.toISOString(), "ожидает", body.name!, body.phone!, body.address ?? null);
		const orderId = Number(info.lastInsertRowid);
		const ins = db.prepare("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)");
		for (const oi of orderItems) {
			ins.run(orderId, oi.product_id, oi.quantity, oi.price);
		}
		return orderId;
	});
	const orderId = tx();

	const res = NextResponse.json({ id: orderId, total });
	res.cookies.set(ORDER_COOKIE, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		expires
	});
	return res;
}


