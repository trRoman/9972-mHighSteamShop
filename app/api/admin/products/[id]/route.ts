import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
	if (!getCurrentAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const db = getDb();
	const id = Number(params.id);
	const body = await req.json().catch(() => null) as { name?: string; description?: string; price?: number } | null;
	if (!id || !body) return NextResponse.json({ error: "Bad request" }, { status: 400 });
	const stmt = db.prepare("UPDATE products SET name = COALESCE(?, name), description = COALESCE(?, description), price = COALESCE(?, price) WHERE id = ?");
	stmt.run(body.name ?? null, body.description ?? null, typeof body.price === "number" ? Math.max(0, Math.floor(body.price)) : null, id);
	return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
	if (!getCurrentAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const db = getDb();
	const id = Number(params.id);
	if (!id) return NextResponse.json({ error: "Bad request" }, { status: 400 });
	db.prepare("DELETE FROM products WHERE id = ?").run(id);
	return NextResponse.json({ ok: true });
}


