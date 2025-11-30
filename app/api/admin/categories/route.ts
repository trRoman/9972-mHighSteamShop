import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
	if (!getCurrentAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const db = getDb();
	const rows = db.prepare("SELECT id, slug, name, is_default FROM categories ORDER BY name ASC").all();
	return NextResponse.json({ items: rows });
}

export async function POST(req: NextRequest) {
	if (!getCurrentAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const body = await req.json().catch(() => null) as { slug?: string; name?: string } | null;
	if (!body || !body.slug || !body.name) return NextResponse.json({ error: "Bad request" }, { status: 400 });
	const slug = body.slug.trim().toLowerCase();
	if (!/^[a-z0-9-]+$/.test(slug)) return NextResponse.json({ error: "Неверный slug" }, { status: 400 });
	const db = getDb();
	try {
		const info = db.prepare("INSERT INTO categories (slug, name) VALUES (?, ?)").run(slug, body.name.trim());
		return NextResponse.json({ id: info.lastInsertRowid });
	} catch (e: any) {
		return NextResponse.json({ error: "Slug уже существует" }, { status: 400 });
	}
}


