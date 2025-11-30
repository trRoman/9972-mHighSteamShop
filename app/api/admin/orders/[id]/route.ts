// app/api/admin/orders/[id]/route.ts
// Этот файл обрабатывает запросы на обновление статуса заказа в админ-панели

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth";

const ALLOWED = new Set(["выполнен", "в обработке", "ожидает"]);

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
	const admin = await getCurrentAdmin(req);
	if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const id = Number(params.id);
	if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

	const body = await req.json().catch(() => ({}));
	const status: string | undefined = body?.status;
	if (!status || !ALLOWED.has(status)) {
		return NextResponse.json({ error: "Invalid status" }, { status: 400 });
	}

	const db = getDb();
	const res = db.prepare(`UPDATE orders SET status = ? WHERE id = ?`).run(status, id);
	if (res.changes === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

	const row = db.prepare(`
		SELECT id, created_at AS createdAt, total_price AS total, status,
		       customer_name AS name, customer_phone AS phone, customer_address AS address
		FROM orders WHERE id = ?
	`).get(id);
	return NextResponse.json({ item: row });
}
