import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { itemId: string } }) {
	const admin = await getCurrentAdmin(req);
	if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const itemId = Number(params.itemId);
	if (!Number.isFinite(itemId)) return NextResponse.json({ error: "Invalid item id" }, { status: 400 });

	const body = await req.json().catch(() => ({}));
	const checked = body?.checked;
	if (typeof checked !== "boolean") return NextResponse.json({ error: "Invalid checked" }, { status: 400 });

	const db = getDb();
	const res = db.prepare(`UPDATE order_items SET checked = ? WHERE id = ?`).run(checked ? 1 : 0, itemId);
	if (res.changes === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

	return NextResponse.json({ ok: true });
}

