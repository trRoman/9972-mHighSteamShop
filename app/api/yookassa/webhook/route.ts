import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID!;
const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY!;

// Always return 200 to YooKassa — they retry on non-2xx
function ok() {
	return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
	let body: { object?: { id?: string } } | null = null;
	try {
		body = await req.json();
	} catch {
		return ok();
	}

	const paymentId = body?.object?.id;
	if (!paymentId || typeof paymentId !== "string") return ok();

	// Re-verify by fetching the payment from YooKassa API
	// Never trust the webhook body alone
	const auth = Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString("base64");

	let payment: {
		id: string;
		status: string;
		metadata?: { order_id?: string };
	} | null = null;

	try {
		const res = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
			headers: { "Authorization": `Basic ${auth}` },
		});
		if (!res.ok) return ok();
		payment = await res.json();
	} catch {
		return ok();
	}

	if (!payment) return ok();

	const orderId = Number(payment.metadata?.order_id);
	if (!orderId) return ok();

	const db = getDb();

	if (payment.status === "succeeded") {
		db.prepare("UPDATE orders SET status = 'оплачен' WHERE id = ?").run(orderId);
	} else if (payment.status === "canceled") {
		// Payment expired or user cancelled — delete the order
		db.prepare("DELETE FROM orders WHERE id = ?").run(orderId);
	}

	return ok();
}
