import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

const ORDER_COOKIE = "order_token";

const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID!;
const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY!;
const YOOKASSA_TAX_SYSTEM_CODE = Number(process.env.YOOKASSA_TAX_SYSTEM_CODE || "6");
const YOOKASSA_VAT_CODE = Number(process.env.YOOKASSA_VAT_CODE || "1");

export async function POST(req: NextRequest) {
	const db = getDb();
	const body = await req.json().catch(() => null) as {
		name?: string;
		phone?: string;
		address?: string;
		deliveryTime?: string;
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
	const getProduct = db.prepare("SELECT id, price, name FROM products WHERE id = ?");
	let total = 0;
	const orderItems: Array<{ product_id: number; quantity: number; price: number; name: string }> = [];
	for (const it of body.items) {
		const p = getProduct.get(it.id) as { id: number; price: number; name: string } | undefined;
		if (!p) continue;
		const qty = Math.max(1, Math.floor(it.quantity || 1));
		total += p.price * qty;
		orderItems.push({ product_id: p.id, quantity: qty, price: p.price, name: p.name });
	}
	if (orderItems.length === 0) {
		return NextResponse.json({ error: "Empty items" }, { status: 400 });
	}

	// Create order in DB with status "ожидает_оплаты"
	const tx = db.transaction(() => {
		const info = db.prepare(
			"INSERT INTO orders (total_price, client_token, expires_at, status, customer_name, customer_phone, customer_address, created_to) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
		).run(total, token, expires.toISOString(), "ожидает_оплаты", body.name!, body.phone!, body.address ?? null, body.deliveryTime ?? null);
		const orderId = Number(info.lastInsertRowid);
		const ins = db.prepare("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)");
		for (const oi of orderItems) {
			ins.run(orderId, oi.product_id, oi.quantity, oi.price);
		}
		return orderId;
	});
	const orderId = tx();

	// Create YooKassa payment
	const phoneDigits = body.phone.replace(/\D/g, ""); // "79XXXXXXXXX"
	const auth = Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString("base64");

	let confirmationToken: string | null = null;

	try {
		const paymentRes = await fetch("https://api.yookassa.ru/v3/payments", {
			method: "POST",
			headers: {
				"Authorization": `Basic ${auth}`,
				"Idempotence-Key": `order-${orderId}-${Date.now()}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				amount: {
					value: total.toFixed(2),
					currency: "RUB",
				},
				capture: true,
				confirmation: {
					type: "embedded",
				},
				description: `Заказ #${orderId}`,
				metadata: {
					order_id: String(orderId),
				},
				receipt: {
					customer: {
						phone: phoneDigits.startsWith("7") ? phoneDigits : "7" + phoneDigits,
					},
					tax_system_code: YOOKASSA_TAX_SYSTEM_CODE,
					items: orderItems.map(oi => ({
						description: oi.name,
						quantity: String(oi.quantity),
						amount: {
							value: oi.price.toFixed(2),
							currency: "RUB",
						},
						vat_code: YOOKASSA_VAT_CODE,
						payment_mode: "full_payment",
						payment_subject: "commodity",
					})),
				},
			}),
		});

		if (!paymentRes.ok) {
			const errBody = await paymentRes.text();
			console.error("YooKassa payment creation failed:", paymentRes.status, errBody);
			throw new Error("YooKassa error");
		}

		const payment = await paymentRes.json() as {
			id: string;
			confirmation?: { confirmation_token?: string };
		};

		confirmationToken = payment.confirmation?.confirmation_token ?? null;

		// Store payment_id in order
		db.prepare("UPDATE orders SET payment_id = ? WHERE id = ?").run(payment.id, orderId);

	} catch (err) {
		// If YooKassa fails — rollback order
		db.prepare("DELETE FROM orders WHERE id = ?").run(orderId);
		console.error("Order creation rolled back due to YooKassa error:", err);
		return NextResponse.json({ error: "Ошибка создания платежа. Попробуйте ещё раз." }, { status: 502 });
	}

	const res = NextResponse.json({ id: orderId, total, confirmationToken });
	res.cookies.set(ORDER_COOKIE, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		expires,
	});
	return res;
}
