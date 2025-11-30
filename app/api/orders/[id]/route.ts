import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const ORDER_COOKIE = "order_token";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
	const token = req.cookies.get(ORDER_COOKIE)?.value;
	if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });
	const id = Number(params.id);
	if (!id) return NextResponse.json({ error: "Bad request" }, { status: 400 });
	const db = getDb();
	const exists = db.prepare("SELECT id FROM orders WHERE id = ? AND client_token = ?").get(id, token) as { id: number } | undefined;
	if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
	db.prepare("DELETE FROM orders WHERE id = ?").run(id);
	return NextResponse.json({ ok: true });
}


